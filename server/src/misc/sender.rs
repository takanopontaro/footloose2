use crate::{
    errors::{
        BookmarkError, CommandError, SenderError, TaskError, VirtualDirError,
        WatchError,
    },
    traits::ErrorCode,
};

use anyhow::{Error, Result};
use async_trait::async_trait;
use axum::extract::ws::{Message, WebSocket};
use futures::{stream::SplitSink, SinkExt as _};
#[cfg(test)]
use mockall::automock;
use serde_json::{json, Value};
use tokio::sync::Mutex;
use uuid::Uuid;

/// WebSocket メッセージ送信機能を定義するトレイト。
///
/// クライアントへの WebSocket メッセージ送信を抽象化する。
/// 各種イベント (成功、エラー、データ更新等) の送信メソッドを提供する。
#[cfg_attr(test, automock)]
#[async_trait]
pub trait SenderTrait: Send + Sync {
    /// 送信者 ID を取得する。
    fn id(&self) -> &str;

    /// コマンド実行成功を通知する。
    ///
    /// # Arguments
    /// * `cid` - コマンド ID
    async fn success(&self, cid: &str) -> Result<()>;

    /// コマンド実行エラーを通知する。
    ///
    /// # Arguments
    /// * `cid` - コマンド ID
    /// * `err` - 発生したエラー
    async fn error(&self, cid: &str, err: &Error) -> Result<()>;

    /// データを含むレスポンスを送信する。
    ///
    /// # Arguments
    /// * `cid` - コマンド ID
    /// * `status` - ステータス文字列
    /// * `data` - 送信するデータ (JSON 形式)
    async fn data(&self, cid: &str, status: &str, data: &Value) -> Result<()>;

    /// コマンド解析エラーを通知する。
    ///
    /// # Arguments
    /// * `err` - 発生したエラー
    async fn command_error(&self, err: &Error) -> Result<()>;

    /// ディレクトリ監視エラーを通知する。
    ///
    /// # Arguments
    /// * `err` - 発生したエラー
    /// * `path` - 監視対象のパス
    async fn watch_error(&self, err: &Error, path: &str) -> Result<()>;

    /// ディレクトリの更新を通知する。
    ///
    /// # Arguments
    /// * `data` - ディレクトリ情報 (JSON 形式)
    async fn dir_update(&self, data: &Value) -> Result<()>;

    /// ProgressTask の開始を通知する。
    ///
    /// # Arguments
    /// * `cid` - コマンド ID
    /// * `pid` - プロセス ID
    async fn progress_task(&self, cid: &str, pid: &str) -> Result<()>;

    /// ProgressTask の進捗を通知する。
    ///
    /// # Arguments
    /// * `pid` - プロセス ID
    /// * `progress` - 進捗率 (0-100)
    async fn progress(&self, pid: &str, progress: usize) -> Result<()>;

    /// ProgressTask の完了を通知する。
    ///
    /// # Arguments
    /// * `pid` - プロセス ID
    async fn progress_end(&self, pid: &str) -> Result<()>;

    /// ProgressTask のエラーを通知する。
    ///
    /// # Arguments
    /// * `pid` - プロセス ID
    /// * `err` - 発生したエラー
    async fn progress_error(&self, pid: &str, err: &Error) -> Result<()>;

    /// ProgressTask の中止を通知する。
    ///
    /// # Arguments
    /// * `pid` - プロセス ID
    async fn progress_abort(&self, pid: &str) -> Result<()>;
}

impl PartialEq for dyn SenderTrait {
    fn eq(&self, other: &Self) -> bool {
        self.id() == other.id()
    }
}

/// WebSocket メッセージの送信を扱う構造体。
///
/// # Fields
/// * `id` - 送信者 ID
/// * `sender` - WebSocket 送信チャネル
pub struct Sender {
    id: String,
    sender: Mutex<SplitSink<WebSocket, Message>>,
}

#[async_trait]
impl SenderTrait for Sender {
    fn id(&self) -> &str {
        &self.id
    }

    async fn success(&self, cid: &str) -> Result<()> {
        let v = json!({ "cid": cid, "status": "SUCCESS" });
        self.send(v).await
    }

    async fn error(&self, cid: &str, err: &Error) -> Result<()> {
        self.generic_error(cid, "ERROR", err).await
    }

    async fn data(&self, cid: &str, status: &str, data: &Value) -> Result<()> {
        let v = json!({ "cid": cid, "status": status, "data": data });
        self.send(v).await
    }

    async fn command_error(&self, err: &Error) -> Result<()> {
        self.generic_error("", "COMMAND_ERROR", err).await
    }

    async fn watch_error(&self, err: &Error, path: &str) -> Result<()> {
        let v = json!({
            "cid": "",
            "status": "WATCH_ERROR",
            "data": {
                "code": err_code(err),
                "msg": err.to_string(),
                "path": path
            }
        });
        self.send(v).await
    }

    async fn dir_update(&self, data: &Value) -> Result<()> {
        self.data("", "DIR_UPDATE", data).await
    }

    async fn progress_task(&self, cid: &str, pid: &str) -> Result<()> {
        let v = json!({ "pid": pid });
        self.data(cid, "PROGRESS_TASK", &v).await
    }

    async fn progress(&self, pid: &str, progress: usize) -> Result<()> {
        let v = json!({
            "cid": "",
            "status": "PROGRESS",
            "data": { "pid": pid, "progress": progress }
        });
        self.send(v).await
    }

    async fn progress_end(&self, pid: &str) -> Result<()> {
        let v = json!({
            "cid": "",
            "status": "PROGRESS_END",
            "data": { "pid": pid }
        });
        self.send(v).await
    }

    async fn progress_error(&self, pid: &str, err: &Error) -> Result<()> {
        let v = json!({
            "cid": "",
            "status": "PROGRESS_ERROR",
            "data": { "pid": pid, "msg": err.to_string() }
        });
        self.send(v).await
    }

    async fn progress_abort(&self, pid: &str) -> Result<()> {
        let v = json!({
            "cid": "",
            "status": "PROGRESS_ABORT",
            "data": { "pid": pid }
        });
        self.send(v).await
    }
}

impl Sender {
    /// 新しい Sender インスタンスを作成する。
    ///
    /// # Arguments
    /// * `sender` - WebSocket 送信チャネル
    pub fn new(sender: SplitSink<WebSocket, Message>) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            sender: Mutex::new(sender),
        }
    }

    /// メッセージを送信する。
    ///
    /// # Arguments
    /// * `val` - 送信するデータ
    ///
    /// # Errors
    /// - `SenderError::Send`:
    ///   送信に失敗した。
    async fn send(&self, val: Value) -> Result<()> {
        let msg = Message::Text(val.to_string().into());
        let mut sender = self.sender.lock().await;
        sender.send(msg).await.map_err(|_| SenderError::Send.into())
    }

    /// 汎用的なエラーメッセージを送信する。
    ///
    /// # Arguments
    /// * `cid` - コマンド ID
    /// * `status` - ステータス文字列
    /// * `err` - エラー
    async fn generic_error(
        &self,
        cid: &str,
        status: &str,
        err: &Error,
    ) -> Result<()> {
        let v = json!({
            "cid": cid,
            "status": status,
            "data": { "code": err_code(err), "msg": err.to_string() },
        });
        self.send(v).await
    }
}

/// エラーを特定の型にダウンキャストしてエラーコードを取得するマクロ。
macro_rules! try_downcast_err {
    ($err:expr, [$( $ty:ty ),*]) => {{
        let mut code = "";
        for cause in $err.chain() {
            $(
                if let Some(e) = cause.downcast_ref::<$ty>() {
                    code = e.code();
                    break;
                }
            )*
        }
        code
    }};
}

/// エラーから定義済みのエラーコードを取得する。
///
/// # Arguments
/// * `err` - エラー
fn err_code(err: &Error) -> &str {
    try_downcast_err!(
        err,
        [
            BookmarkError,
            CommandError,
            SenderError,
            TaskError,
            VirtualDirError,
            WatchError
        ]
    )
}
