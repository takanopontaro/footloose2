use anyhow::Error;
use serde_json::Value;
use std::{future::Future, pin::Pin};

pub type DisposeType =
    Box<dyn FnOnce() -> Pin<Box<dyn Future<Output = ()> + Send>> + Send + Sync>;

pub enum TaskResult {
    Success(SuccessTaskResult),
    Error(ErrorTaskResult),
    Data(DataTaskResult),
    Progress(ProgressTaskResult),
}

impl TaskResult {
    pub fn success() -> Self {
        Self::Success(SuccessTaskResult {})
    }

    pub fn error(err: Error) -> Self {
        Self::Error(ErrorTaskResult { err })
    }

    pub fn data(data: Value, status: Option<String>) -> Self {
        Self::Data(DataTaskResult { data, status })
    }

    pub fn progress(pid: String, dispose: DisposeType) -> Self {
        Self::Progress(ProgressTaskResult { pid, dispose })
    }
}

pub struct SuccessTaskResult {}

pub struct ErrorTaskResult {
    pub err: Error,
}

pub struct DataTaskResult {
    pub data: Value,
    pub status: Option<String>,
}

pub struct ProgressTaskResult {
    pub pid: String,
    pub dispose: DisposeType,
}
