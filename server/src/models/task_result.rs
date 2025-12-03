use anyhow::Error;
use serde_json::Value;
use std::{future::Future, pin::Pin};

/// タスク中止時に実行される中断処理関数の型。
pub type DisposeType =
    Box<dyn FnOnce() -> Pin<Box<dyn Future<Output = ()> + Send>> + Send + Sync>;

/// タスクの実行結果を表す列挙型。
///
/// # Variants
/// * `Success` - タスクが正常に完了した
/// * `Error` - タスク実行中にエラーが発生した
/// * `Data` - タスクがデータを返した
/// * `Progress` - ProgressTask が進行中である
pub enum TaskResult {
    Success(SuccessTaskResult),
    Error(ErrorTaskResult),
    Data(DataTaskResult),
    Progress(ProgressTaskResult),
}

impl TaskResult {
    /// 成功結果を生成する。
    pub fn success() -> Self {
        Self::Success(SuccessTaskResult {})
    }

    /// エラー結果を生成する。
    ///
    /// # Arguments
    /// * `err` - 発生したエラー
    pub fn error(err: Error) -> Self {
        Self::Error(ErrorTaskResult { err })
    }

    /// データ結果を生成する。
    ///
    /// # Arguments
    /// * `data` - データ (JSON や文字列など)
    /// * `status` - ステータス文字列
    pub fn data(data: Value, status: Option<String>) -> Self {
        Self::Data(DataTaskResult { data, status })
    }

    /// ProgressTask 結果を生成する。
    ///
    /// # Arguments
    /// * `pid` - プロセス ID
    /// * `dispose` - 中断処理関数
    pub fn progress(pid: String, dispose: DisposeType) -> Self {
        Self::Progress(ProgressTaskResult { pid, dispose })
    }
}

/// 成功結果の構造体。
pub struct SuccessTaskResult {}

/// エラー結果の構造体。
///
/// # Fields
/// * `err` - 発生したエラー
pub struct ErrorTaskResult {
    pub err: Error,
}

/// データ結果の構造体。
///
/// # Fields
/// * `data` - データ (JSON や文字列など)
/// * `status` - ステータス文字列
pub struct DataTaskResult {
    pub data: Value,
    pub status: Option<String>,
}

/// ProgressTask 結果の構造体。
///
/// # Fields
/// * `pid` - プロセス ID
/// * `dispose` - 中断処理関数
pub struct ProgressTaskResult {
    pub pid: String,
    pub dispose: DisposeType,
}
