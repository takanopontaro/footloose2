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

#[cfg_attr(test, automock)]
#[async_trait]
pub trait SenderTrait: Send + Sync {
    fn id(&self) -> &str;
    async fn success(&self, cid: &str) -> Result<()>;
    async fn error(&self, cid: &str, err: &Error) -> Result<()>;
    async fn data(&self, cid: &str, status: &str, data: &Value) -> Result<()>;
    async fn command_error(&self, err: &Error) -> Result<()>;
    async fn watch_error(&self, err: &Error, path: &str) -> Result<()>;
    async fn dir_update(&self, data: &Value) -> Result<()>;
    async fn progress_task(&self, cid: &str, pid: &str) -> Result<()>;
    async fn progress(&self, pid: &str, progress: usize) -> Result<()>;
    async fn progress_end(&self, pid: &str) -> Result<()>;
    async fn progress_error(&self, pid: &str, err: &Error) -> Result<()>;
    async fn progress_abort(&self, pid: &str) -> Result<()>;
}

impl PartialEq for dyn SenderTrait {
    fn eq(&self, other: &Self) -> bool {
        self.id() == other.id()
    }
}

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
    pub fn new(sender: SplitSink<WebSocket, Message>) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            sender: Mutex::new(sender),
        }
    }

    async fn send(&self, val: Value) -> Result<()> {
        let msg = Message::Text(val.to_string().into());
        let mut sender = self.sender.lock().await;
        sender.send(msg).await.map_err(|_| SenderError::Send.into())
    }

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
