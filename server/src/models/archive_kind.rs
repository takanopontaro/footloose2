use crate::errors::VirtualDirError;

use anyhow::Result;

/// アーカイブの種類を表す列挙型。
///
/// # Variants
/// * `Zip` - zip アーカイブ (.zip)
/// * `Tar` - tar アーカイブ (.tar)
/// * `Tgz` - tgz アーカイブ (.tgz, .tar.gz)
#[derive(PartialEq)]
pub enum ArchiveKind {
    Zip,
    Tar,
    Tgz,
}

impl ArchiveKind {
    /// 文字列から列挙型を生成する。
    ///
    /// # Arguments
    /// * `s` - アーカイブの種類を表す文字列
    ///
    /// # Errors
    /// - `VirtualDirError::UnsupportedArchive`:
    ///   サポートされていないアーカイブ形式である。
    pub fn from_str(s: &str) -> Result<Self> {
        match s {
            "zip" => Ok(Self::Zip),
            "tar" => Ok(Self::Tar),
            "tgz" => Ok(Self::Tgz),
            _ => Err(VirtualDirError::UnsupportedArchive.into()),
        }
    }
}
