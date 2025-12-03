use crate::traits::ErrorCode;

use thiserror::Error;

/// メッセージ送信に関するエラー。
///
/// # Variants
/// * `Send` - メッセージの送信に失敗した
#[derive(Debug, Error, PartialEq)]
pub enum SenderError {
    #[error("Failed to send message")]
    Send,
}

impl ErrorCode for SenderError {
    fn code(&self) -> &str {
        match self {
            Self::Send => "E002001",
        }
    }
}
