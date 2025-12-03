use crate::traits::ErrorCode;

use thiserror::Error;

/// ディレクトリ監視に関するエラー。
///
/// # Variants
/// * `Watch` - ディレクトリ監視の開始に失敗した
/// * `Dir` - ディレクトリが利用不可になった
///   対象が削除された場合などに発生する。
#[derive(Debug, Error, PartialEq)]
pub enum WatchError {
    #[error("Failed to watch ({1}): {0}")]
    Watch(String, String),
    #[error("Directory unavailable ({1}): {0}")]
    Dir(String, String),
}

impl ErrorCode for WatchError {
    fn code(&self) -> &str {
        match self {
            Self::Watch(_, _) => "E004001",
            Self::Dir(_, _) => "E004002",
        }
    }
}
