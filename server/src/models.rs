//! データモデルを提供するモジュール。

mod archive_kind;
mod bookmark;
mod client_config;
mod entry;
mod mime_type;
mod progress_task_arg;
mod progress_task_config;
mod sh_task_config;
mod task_arg;
mod task_control;
mod task_result;
mod watch_control;

pub use archive_kind::ArchiveKind;
pub use bookmark::Bookmark;
pub use client_config::ClientConfig;
pub use entry::Entry;
pub use mime_type::MimeType;
pub use progress_task_arg::ProgressTaskArg;
pub use progress_task_config::ProgressTaskConfig;
pub use sh_task_config::ShTaskConfig;
pub use task_arg::TaskArg;
pub use task_control::{TaskControl, TaskStatus};
pub use task_result::{DisposeType, TaskResult};
pub use watch_control::{WatchControl, WatchStatus};
