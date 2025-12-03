//! トレイトを提供するモジュール。

mod archive;
mod archive_entry;
mod error;
mod internal_task_base;
mod task_base;

pub use archive::{Archive, ArchiveEntryIter};
pub use archive_entry::ArchiveEntry;
pub use error::ErrorCode;
pub use internal_task_base::InternalTaskBase;
pub use task_base::TaskBase;

#[cfg(test)]
pub use internal_task_base::MockInternalTaskBase;
#[cfg(test)]
pub use task_base::MockTaskBase;
