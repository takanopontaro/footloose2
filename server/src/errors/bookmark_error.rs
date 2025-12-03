use crate::traits::ErrorCode;

use thiserror::Error;

/// ブックマーク操作に関するエラー。
///
/// # Variants
/// * `NotAvailable` - ブックマーク機能が利用できない
/// * `NotFound` - 指定されたブックマークが見つからない
/// * `Exists` - ブックマークがすでに存在する
/// * `IO` - ファイルアクセスに失敗した
#[derive(Debug, Error, PartialEq)]
pub enum BookmarkError {
    #[error("Bookmark not available")]
    NotAvailable,
    #[error("Bookmark not found")]
    NotFound,
    #[error("Bookmark already exists")]
    Exists,
    #[error("Failed to access file: {0}")]
    IO(String),
}

impl ErrorCode for BookmarkError {
    fn code(&self) -> &str {
        match self {
            Self::NotAvailable => "E005001",
            Self::NotFound => "E005002",
            Self::Exists => "E005003",
            Self::IO(_) => "E005004",
        }
    }
}
