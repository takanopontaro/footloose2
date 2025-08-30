mod archives;
mod errors;
mod helpers;
mod managers;
mod misc;
mod models;
mod tasks;
mod test_helpers;
mod traits;

use crate::helpers::decode_string;

use anyhow::{ensure, Result};
use axum::{
    body::Body,
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path as AxumPath, State,
    },
    http::{HeaderMap, HeaderValue, Request, Response, StatusCode},
    response::{Html, IntoResponse},
    routing::get,
    Router,
};
use base64::{engine::general_purpose, Engine as _};
use clap::Parser;
use futures::stream::StreamExt as _;
use helpers::logo_standard;
use managers::{BookmarkManager, TaskManager, WatchManager};
use misc::{Command, FrameSet, Sender};
use models::TaskArg;
use regex::Regex;
use std::{
    fs::{self, create_dir_all},
    path::{Path, PathBuf},
    sync::Arc,
};
use tasks::{
    AbortProgressTask, BookmarkTask, ChangeDirTask, ChangeVirtualDirTask,
    ExtractEntriesTask, OpenTask, ProgressTask, RemoveClientTask, ShTask,
};
use tokio::io::AsyncReadExt as _;
use tower_http::services::{ServeDir, ServeFile};

const HTML_TEMPLATE: &str = r#"
<html class="previewWindow">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<link rel="stylesheet" href="/config/css">
</head>
<body class="previewWindow_body">
<div class="previewWindow_main"><!----></div>
</body>
</html>
"#;

#[derive(Parser, Clone)]
struct Args {
    /// Specify server port
    #[arg(short, default_value = "3000")]
    port: u16,
    /// Specify document root
    #[arg(short)]
    root: String,
    /// Specify custom format for date-time
    #[arg(short, default_value = "%y/%m/%d %H:%M:%S")]
    time_style: String,
    /// Specify bookmark json file
    #[arg(short)]
    bookmark: Option<String>,
    /// Specify user style file
    #[arg(short = 's')]
    style: Option<String>,
    /// Specify user config file (js|ts)
    #[arg(short)]
    config: Option<String>,
}

struct AppState {
    args: Arc<Args>,
    task_manager: Arc<TaskManager>,
}

fn get_css_path(args: &Args) -> PathBuf {
    let root = Path::new(&args.root);
    args.style
        .clone()
        .map_or_else(|| root.join("app.css"), PathBuf::from)
}

fn get_config_path(args: &Args) -> PathBuf {
    let root = Path::new(&args.root);
    args.config
        .clone()
        .map_or_else(|| root.join("config.ts"), PathBuf::from)
}

fn validate_args(args: &Args) -> Result<()> {
    ensure!(
        // No need to check args.port < 65536 because u16 is 0..=65535
        args.port > 0,
        "'-p' must be between 1 and 65535"
    );
    ensure!(get_css_path(args).is_file(), "User style file not found");
    ensure!(
        get_config_path(args).is_file(),
        "User config file not found"
    );
    if args.bookmark.is_none() {
        return Ok(());
    }
    let path = args.bookmark.as_ref().unwrap();
    let path = Path::new(path);
    if path.is_file() {
        return Ok(());
    }
    if let Some(p) = path.parent() {
        create_dir_all(p)?;
    }
    fs::write(path, "[]")?;
    println!("Bookmark file not found, created: {path:?}");
    Ok(())
}

fn create_task_manager(args: &Args) -> Arc<TaskManager> {
    let watch_manager = WatchManager::new(&args.time_style);
    let bookmark_manager = BookmarkManager::new(&args.bookmark);
    let mut task_manager = TaskManager::new();
    task_manager.register("kill", AbortProgressTask::new());
    task_manager.register("cd", ChangeDirTask::new(watch_manager.clone()));
    task_manager
        .register("bookmark", BookmarkTask::new(bookmark_manager.clone()));
    task_manager.register("open", OpenTask::new());
    task_manager.register("progress", ProgressTask::new());
    task_manager.register("sh", ShTask::new());
    task_manager.register(
        "cvd",
        ChangeVirtualDirTask::new(watch_manager.clone(), &args.time_style),
    );
    task_manager.register("vcp", ExtractEntriesTask::new());
    task_manager.register_internal(
        "remove_client",
        RemoveClientTask::new(watch_manager.clone()),
    );
    Arc::new(task_manager)
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();
    if let Err(err) = validate_args(&args) {
        eprintln!("{err}");
        std::process::exit(1);
    }
    let state = Arc::new(AppState {
        args: Arc::new(args.clone()),
        task_manager: create_task_manager(&args),
    });
    let app = Router::new()
        .route("/", get(index_handler))
        .route("/index.html", get(index_handler))
        .route("/ws", get(ws_handler))
        .route("/config/{name}", get(config_handler))
        .route("/preview/{*path}", get(preview_handler))
        .fallback_service(ServeDir::new(args.root))
        .with_state(state);
    let addr = format!("127.0.0.1:{}", args.port);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    logo_standard();
    axum::serve(listener, app).await?;
    Ok(())
}

fn empty_body_html(status: StatusCode) -> Response<Body> {
    let mut headers = HeaderMap::new();
    headers.insert(
        "Cache-Control",
        HeaderValue::from_static("public, max-age=3600"),
    );
    (status, headers, Html(HTML_TEMPLATE)).into_response()
}

fn ok_200(html: String) -> Response<Body> {
    (StatusCode::OK, Html(html)).into_response()
}

fn error_204() -> Response<Body> {
    empty_body_html(StatusCode::NO_CONTENT)
}

fn error_404() -> Response<Body> {
    empty_body_html(StatusCode::NOT_FOUND)
}

fn error_500() -> Response<Body> {
    empty_body_html(StatusCode::INTERNAL_SERVER_ERROR)
}

async fn is_text_file(path: &Path) -> Result<bool> {
    let mut file = tokio::fs::File::open(path).await?;
    let mut chunk = [0; 4096];
    let len = file.read(&mut chunk).await?;
    let bytes = &chunk[..len];
    // NULL バイトがあるならバイナリ
    if bytes.contains(&0) {
        return Ok(false);
    }
    let mut suspicious = 0;
    for &b in bytes {
        // 制御文字 (タブ、LF、CR 以外) は怪しい
        if b < 0x09 || (b > 0x0D && b < 0x20) {
            suspicious += 1;
        }
    }
    // 制御文字の割合が一定以上ならバイナリとみなす
    let ratio = suspicious as f32 / bytes.len() as f32;
    if ratio > 0.05 {
        return Ok(false);
    };
    Ok(true)
}

async fn process_file(path: &Path) -> Result<Response<Body>> {
    let req = Request::get("/").body(Body::empty()).unwrap();
    let res = ServeFile::new(path).try_call(req).await?;
    Ok(res.into_response())
}

async fn process_text(path: &Path) -> Result<Response<Body>> {
    let bytes = tokio::fs::read(path).await?;
    let text = decode_string(&bytes);
    let html = HTML_TEMPLATE.replace("<!---->", &text);
    Ok(ok_200(html))
}

async fn compile_typescript(path: PathBuf) -> Result<String> {
    let dir = path.parent().unwrap();
    let file = path.file_name().unwrap();
    let output = tokio::process::Command::new("npx")
        .current_dir(dir)
        .args([
            "--yes",
            "--package=esbuild@0.25.9",
            "esbuild",
            file.to_str().unwrap(),
            "--bundle",
            "--platform=node",
            "--format=esm",
        ])
        .output()
        .await?;
    if output.status.success() {
        let code = String::from_utf8_lossy(&output.stdout).to_string();
        return Ok(code);
    }
    let msg = String::from_utf8_lossy(&output.stderr).to_string();
    Err(anyhow::anyhow!(msg))
}

async fn index_handler(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let args = state.args.clone();
    let index = Path::new(&args.root).join("index.html");
    let Ok(mut contents) = tokio::fs::read_to_string(&index).await else {
        return error_500();
    };
    let css_path = get_css_path(&args);
    match tokio::fs::read_to_string(css_path).await {
        Ok(css) => contents = contents.replace("%css%", &css),
        Err(_) => return error_500(),
    };
    let config_path = get_config_path(&args);
    let code = if config_path.to_string_lossy().ends_with(".ts") {
        match compile_typescript(config_path).await {
            Ok(code) => code,
            Err(_) => return error_500(),
        }
    } else {
        match tokio::fs::read_to_string(config_path).await {
            Ok(code) => code,
            Err(_) => return error_500(),
        }
    };
    let code = general_purpose::STANDARD.encode(&code);
    contents = contents.replace("%js%", &code);
    ok_200(contents)
}

async fn config_handler(
    AxumPath(name): AxumPath<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let args = state.args.clone();
    match name.as_str() {
        "css" => {
            let path = get_css_path(&args);
            process_file(&path).await.unwrap_or_else(|_| error_500())
        }
        _ => error_404(),
    }
}

async fn preview_handler(
    AxumPath(path): AxumPath<String>,
) -> impl IntoResponse {
    let p = format!("/{path}");
    let path = PathBuf::from(p);
    if tokio::fs::metadata(&path).await.is_err() {
        return error_204();
    }
    let Ok(is_txt) = is_text_file(&path).await else {
        return error_204();
    };
    if is_txt {
        return process_text(&path).await.unwrap_or_else(|_| error_204());
    }
    let Ok(Some(kind)) = infer::get_from_path(&path) else {
        return error_204();
    };
    let mime = kind.mime_type();
    let re = Regex::new(r"^(:?image|video|audio)/").unwrap();
    if re.is_match(mime) || mime == "application/pdf" {
        return process_file(&path).await.unwrap_or_else(|_| error_204());
    }
    error_204()
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(stream: WebSocket, state: Arc<AppState>) {
    let (sender, mut receiver) = stream.split();
    let task_manager = state.task_manager.clone();
    let task_arg =
        Arc::new(TaskArg::new(FrameSet::new(), Arc::new(Sender::new(sender))));

    let task_manager_ = task_manager.clone();
    let task_arg_ = task_arg.clone();
    while let Some(Ok(Message::Text(text))) = receiver.next().await {
        let task_manager = task_manager_.clone();
        let task_arg = task_arg_.clone();
        tokio::spawn(async move {
            let _ = match Command::new(&text) {
                Ok(cmd) => task_manager.run(&cmd, &task_arg).await,
                Err(err) => task_arg.sender.command_error(&err).await,
            };
        });
    }

    task_manager.drop_all_disposers(task_arg.sender.id()).await;
    task_manager.run_internal("remove_client", &task_arg).await;
}
