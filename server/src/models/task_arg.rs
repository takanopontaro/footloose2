use crate::misc::{FrameSet, SenderTrait};

use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

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
    pub fn new(frame_set: FrameSet, sender: Arc<dyn SenderTrait>) -> Self {
        Self {
            uid: Uuid::new_v4().to_string(),
            frame_set: Mutex::new(frame_set),
            sender,
        }
    }
}
