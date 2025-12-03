use crate::traits::ErrorCode;

use thiserror::Error;

/// 仮想ディレクトリ操作に関するエラー。
///
/// # Variants
/// * `UnsupportedArchive` - サポートされていないアーカイブ形式である
/// * `OutsideRoot` - 仮想ディレクトリ外へのアクセスである
/// * `Args` - コマンド引数が不正である
#[derive(Debug, Error, PartialEq)]
pub enum VirtualDirError {
    #[error("Unsupported archive type")]
    UnsupportedArchive,
    #[error("Outside the virtual root")]
    OutsideRoot,
    #[error("Invalid arguments")]
    Args,
}

impl ErrorCode for VirtualDirError {
    fn code(&self) -> &str {
        match self {
            Self::UnsupportedArchive => "E006001",
            Self::OutsideRoot => "E006002",
            Self::Args => "E006003",
        }
    }
}
