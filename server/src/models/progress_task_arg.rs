use crate::{misc::SenderTrait, models::TaskControl};

use std::sync::Arc;
use tokio::{
    io::BufReader,
    process::{Child, ChildStderr, ChildStdout},
    sync::{mpsc, Mutex},
};

pub struct ProgressTaskArg {
    pub total: usize,
    pub stdout: BufReader<ChildStdout>,
    pub stderr: BufReader<ChildStderr>,
    pub child: Arc<Mutex<Child>>,
    pub sender: Arc<dyn SenderTrait>,
    pub tx: mpsc::Sender<TaskControl>,
}
