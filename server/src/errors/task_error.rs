use crate::traits::ErrorCode;

use thiserror::Error;

#[derive(Debug, Error, PartialEq)]
pub enum TaskError {
    #[error("Failed to run task: {0}")]
    Run(String),
}

impl ErrorCode for TaskError {
    fn code(&self) -> &str {
        match self {
            Self::Run(_) => "E003001",
        }
    }
}
