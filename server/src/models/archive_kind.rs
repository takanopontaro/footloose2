use crate::errors::VirtualDirError;

use anyhow::Result;

#[derive(PartialEq)]
pub enum ArchiveKind {
    Zip,
    Tar,
    Tgz,
}

impl ArchiveKind {
    pub fn from_str(s: &str) -> Result<Self> {
        match s {
            "zip" => Ok(Self::Zip),
            "tar" => Ok(Self::Tar),
            "tgz" => Ok(Self::Tgz),
            _ => Err(VirtualDirError::UnsupportedArchive.into()),
        }
    }
}
