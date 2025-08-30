use crate::traits::ErrorCode;

use thiserror::Error;

#[derive(Debug, Error, PartialEq)]
pub enum CommandError {
    #[error("Failed to parse command")]
    Parse,
    #[error("Command not found")]
    NotFound,
    #[error("Invalid command arguments")]
    Args,
}

impl ErrorCode for CommandError {
    fn code(&self) -> &str {
        match self {
            Self::Parse => "E001001",
            Self::NotFound => "E001002",
            Self::Args => "E001003",
        }
    }
}
