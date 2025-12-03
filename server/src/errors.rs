//! 各種エラーを提供するモジュール。

mod bookmark_error;
mod command_error;
mod sender_error;
mod task_error;
mod virtual_dir_error;
mod watch_error;

pub use bookmark_error::BookmarkError;
pub use command_error::CommandError;
pub use sender_error::SenderError;
pub use task_error::TaskError;
pub use virtual_dir_error::VirtualDirError;
pub use watch_error::WatchError;
