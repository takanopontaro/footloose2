use crate::traits::ErrorCode;

use thiserror::Error;

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
