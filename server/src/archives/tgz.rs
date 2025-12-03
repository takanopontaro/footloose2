use crate::{
    archives::TarEntry,
    traits::{Archive, ArchiveEntry, ArchiveEntryIter},
};

use flate2::read::GzDecoder;
use std::{
    fs::File,
    io::{BufReader, Result},
};

/// Tgz (tar.gz) アーカイブを扱う構造体。
///
/// # Fields
/// * `time_style` - 日時のフォーマット文字列
/// * `archive` - tar::Archive インスタンス (gzip)
pub struct Tgz {
    time_style: String,
    archive: tar::Archive<GzDecoder<BufReader<File>>>,
}

impl Tgz {
    /// 新しい Tgz インスタンスを作成する。
    ///
    /// # Arguments
    /// * `path` - Tgz ファイルのパス
    /// * `time_style` - 日時のフォーマット文字列
    ///
    /// # Returns
    /// 初期化された Tgz インスタンス
    pub fn new(path: &str, time_style: &str) -> anyhow::Result<Self> {
        let file = File::open(path)?;
        let reader = BufReader::new(file);
        let decoder = GzDecoder::new(reader);
        let archive = tar::Archive::new(decoder);
        Ok(Self {
            time_style: time_style.to_owned(),
            archive,
        })
    }
}

impl Archive for Tgz {
    fn entries(&mut self) -> Result<ArchiveEntryIter<'_>> {
        let iter = self.archive.entries()?.map(|res| {
            res.map(|e| {
                let mut item = TarEntry::new(&self.time_style);
                item.init(&e);
                Box::new(item) as Box<dyn ArchiveEntry>
            })
        });
        Ok(Box::new(iter))
    }
}

#[cfg(test)]
mod tests {
    use unicode_normalization::UnicodeNormalization as _;

    use super::*;

    fn nfc(s: &str) -> String {
        s.nfc().to_string()
    }

    #[test]
    fn test_run_success() -> anyhow::Result<()> {
        let archive = "./tests/archives/dir-entries.tgz";
        let time_style = "%y/%m/%d %H:%M:%S";
        let mut tgz = Tgz::new(archive, time_style)?;
        let mut entries: Vec<Box<dyn ArchiveEntry>> = vec![];
        for entry in tgz.entries()? {
            let entry = entry?;
            entries.push(entry);
        }
        assert_eq!(entries[0].path(), "");
        assert_eq!(entries[1].path(), nfc("1 ゲーム/"));
        assert_eq!(entries[8].path(), "2 movies/._2 image.jpg");
        assert_eq!(
            entries[30].path(),
            nfc("1 ゲーム/1 オープンワールド/1 空ディレクトリ/")
        );
        Ok(())
    }

    #[test]
    fn test_run_error() -> Result<()> {
        let archive = "./tests/archives/nonexistent.tgz";
        let time_style = "%y/%m/%d %H:%M:%S";
        let tgz = Tgz::new(archive, time_style);
        assert!(tgz.is_err());
        Ok(())
    }
}
