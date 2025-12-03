use crate::{misc::SenderTrait, models::TaskControl};

use std::sync::Arc;
use tokio::{
    io::BufReader,
    process::{Child, ChildStderr, ChildStdout},
    sync::{mpsc, Mutex},
};

/// ProgressTask の情報を扱う構造体。
///
/// # Fields
/// * `total` - 処理対象エントリの総数
/// * `stdout` - 処理プロセスの stdout
/// * `stderr` - 処理プロセスの stderr
/// * `child` - 処理プロセス
/// * `sender` - WebSocket メッセージを送信する構造体
/// * `tx` - タスク制御メッセージの送信チャネル
pub struct ProgressTaskArg {
    pub total: usize,
    pub stdout: BufReader<ChildStdout>,
    pub stderr: BufReader<ChildStderr>,
    pub child: Arc<Mutex<Child>>,
    pub sender: Arc<dyn SenderTrait>,
    pub tx: mpsc::Sender<TaskControl>,
}
