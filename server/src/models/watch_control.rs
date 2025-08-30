#[derive(Debug, PartialEq)]
pub enum WatchStatus {
    Abort,
}

pub struct WatchControl {
    pub path: String,
    pub status: WatchStatus,
}
