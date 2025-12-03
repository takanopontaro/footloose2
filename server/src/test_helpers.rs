//! テスト用のヘルパー関数を提供するモジュール。

#![cfg(test)]

use crate::{
    helpers::quote_paths,
    misc::{CmdArgsType, Command, FrameSet, MockSenderTrait},
    models::{Entry, TaskArg},
    traits::{ErrorCode, TaskBase},
};

use anyhow::{Error, Result};
use serde::Deserialize;
use serde_json::Value;
use std::{
    fs as StdFs,
    mem::discriminant,
    os::unix::fs::{symlink, PermissionsExt as _},
    process::Command as StdCommand,
    sync::Arc,
    time::Duration,
};
use tempfile::tempdir;
use tokio::fs;

/// テストフィクスチャを表す構造体。
///
/// # Fields
/// * `valid` - 有効なコマンド引数の配列
/// * `invalid` - 無効なコマンド引数の配列
#[derive(Deserialize)]
pub struct Fixture {
    pub valid: Vec<CmdArgsType>,
    pub invalid: Vec<CmdArgsType>,
}

/// ディレクトリ情報を表す構造体。
///
/// # Fields
/// * `path` - ディレクトリのパス
/// * `entries` - ディレクトリ内のエントリ一覧
#[derive(Deserialize)]
pub struct DirInfo {
    pub path: String,
    pub entries: Vec<Entry>,
}

/// 指定ミリ秒スリープする。
///
/// # Arguments
/// * `millis` - スリープするミリ秒数
pub async fn sleep(millis: u64) {
    tokio::time::sleep(Duration::from_millis(millis)).await;
}

/// そのエラーが指定したエラー型と一致するかをアサートする。
///
/// # Arguments
/// * `err` - 検証するエラー
/// * `expected` - 期待されるエラー
pub fn assert_err<E: ErrorCode + PartialEq + 'static>(
    err: &Error,
    expected: &E,
) {
    let e = err.downcast_ref::<E>();
    assert!(e.is_some());
    assert!(discriminant(e.unwrap()) == discriminant(expected));
}

/// テスト用リソース (ディレクトリとファイル) をセットアップする。
///
/// 一時ディレクトリを作成し、その中に以下の構造を作成する。
///
/// ```text
/// /<root>
/// ├── test1/ <- 766
/// │   └── test1.txt <- 644
/// ├── test2/ <- 777
///     └── test2.txt <- 755
/// ├── test3/ <- 777
///     └── (empty)
/// ├── test.txt <- 777
/// └── test1.txt's link -> test1/test1.txt
/// ```
///
/// # Arguments
/// * `content` - テストファイルに書き込む内容
///   <root>/test.txt に書き込まれる。
///
/// # Returns
/// 作成されたテスト用リソースのルートパス
pub async fn setup_resources(content: &str) -> Result<String> {
    let root = tempdir()?;
    let root = root.keep().to_string_lossy().to_string();
    let dir1 = format!("{root}/test1");
    let dir2 = format!("{root}/test2");
    let dir3 = format!("{root}/test3");
    fs::create_dir_all(&dir1).await?;
    fs::create_dir(&dir2).await?;
    fs::create_dir(&dir3).await?;
    let file1 = format!("{dir1}/test1.txt");
    let file2 = format!("{dir2}/test2.txt");
    let file3 = format!("{root}/test.txt");
    fs::write(&file1, "").await?;
    fs::write(&file2, "").await?;
    fs::write(&file3, content).await?;
    symlink(&file1, format!("{root}/test1.txt's link"))?;
    let perms = StdFs::Permissions::from_mode(0o766);
    StdFs::set_permissions(&dir1, perms)?;
    let perms = StdFs::Permissions::from_mode(0o777);
    StdFs::set_permissions(&dir2, perms)?;
    let perms = StdFs::Permissions::from_mode(0o777);
    StdFs::set_permissions(&dir3, perms)?;
    let perms = StdFs::Permissions::from_mode(0o644);
    StdFs::set_permissions(&file1, perms)?;
    let perms = StdFs::Permissions::from_mode(0o755);
    StdFs::set_permissions(&file2, perms)?;
    let perms = StdFs::Permissions::from_mode(0o777);
    StdFs::set_permissions(&file3, perms)?;
    Ok(root)
}

/// テスト用リソースを削除する。
///
/// # Arguments
/// * `path` - 削除するディレクトリのパス
///   setup_resources() で作成されたディレクトリのパスを指定する。
pub async fn teardown_resources(path: &str) -> Result<()> {
    fs::remove_dir_all(&path).await?;
    Ok(())
}

/// テスト用のモック Sender をセットアップする。
///
/// Sender::id は `x` 固定。
///
/// # Returns
/// モック Sender インスタンス
pub fn setup_sender() -> MockSenderTrait {
    let mut mock = MockSenderTrait::new();
    mock.expect_id().return_const("x".to_owned());
    mock
}

/// テスト用の TaskArg をセットアップする。
///
/// # Arguments
/// * `sender` - モック Sender
///
/// # Returns
/// TaskArg インスタンス
pub fn setup_task_arg(sender: MockSenderTrait) -> Arc<TaskArg> {
    Arc::new(TaskArg::new(FrameSet::new(), Arc::new(sender)))
}

/// コマンド文字列を生成する。
///
/// # Arguments
/// * `id` - コマンドID
/// * `frame` - フレーム名
/// * `cwd` - 基準となるディレクトリ
/// * `name` - コマンド名
/// * `args` - コマンド引数 (JSON 文字列)
///
/// # Returns
/// コマンド文字列
pub fn setup_command_str(
    id: &str,
    frame: &str,
    cwd: &str,
    name: &str,
    args: &str,
) -> String {
    format!(
        r#"{{
          "id": "{id}",
          "frame": "{frame}",
          "cwd": "{cwd}",
          "name": "{name}",
          "args": {args}
        }}"#
    )
}

/// テスト用の Command インスタンスを生成する。
///
/// `cwd` が空文字の場合は便宜上 `/foo/bar` を使用する。
/// また、コマンド ID は `1`、フレーム名は `a` で固定。
///
/// おまけ機能として、`👟` という絵文字はすべて `cwd` に置換される。
/// フィクスチャ作成の手間軽減のため。
///
/// # Arguments
/// * `cwd` - 基準となるディレクトリ
/// * `name` - コマンド名
/// * `args` - コマンド引数 (JSON 形式)
///
/// # Returns
/// Command インスタンス
pub fn create_command(cwd: &str, name: &str, args: Value) -> Result<Command> {
    let args = serde_json::to_string(&args)?;
    let args = args.replace("👟", cwd);
    let cwd = if cwd.is_empty() { "/foo/bar" } else { cwd };
    let cmd_str = setup_command_str("1", "a", cwd, name, &args);
    Command::new(&cmd_str)
}

/// フィクスチャファイルを使用して、タスクの JSON Schema 検証をアサートする。
///
/// # Arguments
/// * `fixture_path` - フィクスチャファイルのパス
/// * `name` - コマンド名
/// * `cwd` - 基準となるディレクトリ
/// * `task` - 検証するタスク
pub async fn assert_by_schema(
    fixture_path: &str,
    name: &str,
    cwd: &str,
    task: &impl TaskBase,
) -> Result<()> {
    let data = fs::read_to_string(fixture_path).await?;
    let fixture = serde_json::from_str::<Fixture>(&data)?;
    for args in fixture.valid {
        let args = serde_json::to_value(&args)?;
        let cmd = create_command(cwd, name, args)?;
        assert!(task.validate(&cmd));
    }
    for args in fixture.invalid {
        let args = serde_json::to_value(&args)?;
        let cmd = create_command(cwd, name, args)?;
        assert!(!task.validate(&cmd));
    }
    Ok(())
}

/// ソースパス内の総エントリ数をカウントする。
///
/// # Arguments
/// * `srcs` - ソースパスの配列
///
/// # Returns
/// エントリの総数
pub fn count_entries(srcs: &[String]) -> Result<usize> {
    let srcs = quote_paths(srcs);
    let cmd = format!("find {} | wc -l", srcs);
    let output = StdCommand::new("sh").arg("-c").arg(cmd).output()?;
    let count = String::from_utf8_lossy(&output.stdout).to_string();
    Ok(count.trim().parse()?)
}
