//! 種種雑多な機能を提供するモジュール。

mod command;
mod frame_set;
mod ls;
mod sender;
mod watch;
mod watch_info;

pub use command::{CmdArgsType, Command};
pub use frame_set::FrameSet;
pub use ls::Ls;
pub use sender::{Sender, SenderTrait};
pub use watch::Watch;
pub use watch_info::WatchInfo;

#[cfg(test)]
pub use sender::MockSenderTrait;
