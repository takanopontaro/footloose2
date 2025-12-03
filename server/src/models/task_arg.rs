use crate::misc::{FrameSet, SenderTrait};

use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

/// タスク実行時に渡される引数を扱う構造体。
///
/// # Fields
/// * `uid` - タスク ID
/// * `frame_set` - フレームのパス情報を扱う構造体
/// * `sender` - WebSocket メッセージを送信する構造体
pub struct TaskArg {
    uid: String,
    pub frame_set: Mutex<FrameSet>,
    pub sender: Arc<dyn SenderTrait>,
}

impl PartialEq for TaskArg {
    fn eq(&self, other: &Self) -> bool {
        self.uid == other.uid
    }
}

impl TaskArg {
    /// 新しい TaskArg インスタンスを生成する。
    ///
    /// # Arguments
    /// * `frame_set` - フレームのパス情報を扱う構造体
    /// * `sender` - WebSocket メッセージを送信する構造体
    pub fn new(frame_set: FrameSet, sender: Arc<dyn SenderTrait>) -> Self {
        Self {
            uid: Uuid::new_v4().to_string(),
            frame_set: Mutex::new(frame_set),
            sender,
        }
    }
}
