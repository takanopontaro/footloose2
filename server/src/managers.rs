//! 情報の管理機構を提供するモジュール。

mod bookmark_manager;
mod task_manager;
mod watch_manager;

pub use bookmark_manager::BookmarkManager;
pub use task_manager::TaskManager;
pub use watch_manager::{WatchManager, WatchManagerTrait};

#[cfg(test)]
pub use watch_manager::MockWatchManagerTrait;
