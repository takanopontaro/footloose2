use crate::{
    archives::ZipEntry,
    traits::{Archive, ArchiveEntry, ArchiveEntryIter},
};

use std::{
    fs::File,
    io::{BufReader, Result},
};
use zip::ZipArchive;

/// ZipEntry のイテレータ。
///
/// tar::Archive と違い ZipArchive にはイテレータがないため自作する。
///
/// # Fields
/// * `time_style` - 日時のフォーマット文字列
/// * `archive` - ZipArchive の可変参照
/// * `index` - 現在のインデックス
struct ZipEntryIter<'a> {
    time_style: &'a str,
    archive: &'a mut ZipArchive<BufReader<File>>,
    index: usize,
}

impl<'a> Iterator for ZipEntryIter<'a> {
    type Item = Result<ZipEntry>;

    fn next(&mut self) -> Option<Self::Item> {
        if self.index >= self.archive.len() {
            return None;
        }
        let mut item = ZipEntry::new(self.time_style);
        let Ok(file) = self.archive.by_index_raw(self.index) else {
            self.index += 1;
            return Some(Ok(item));
        };
        item.init(&file);
        self.index += 1;
        Some(Ok(item))
    }
}

/// Zip アーカイブを扱う構造体。
///
/// # Fields
/// * `time_style` - 日時のフォーマット文字列
/// * `archive` - ZipArchive インスタンス
pub struct Zip {
    time_style: String,
    archive: ZipArchive<BufReader<File>>,
}

impl Zip {
    /// 新しい Zip インスタンスを作成する。
    ///
    /// # Arguments
    /// * `path` - Zip ファイルのパス
    /// * `time_style` - 日時のフォーマット文字列
    ///
    /// # Returns
    /// 初期化された Zip インスタンス
    pub fn new(path: &str, time_style: &str) -> anyhow::Result<Self> {
        let file = File::open(path)?;
        let reader = BufReader::new(file);
        let archive = ZipArchive::new(reader)?;
        Ok(Self {
            time_style: time_style.to_owned(),
            archive,
        })
    }
}

impl Archive for Zip {
    fn entries(&mut self) -> Result<ArchiveEntryIter<'_>> {
        let iter = ZipEntryIter {
            time_style: &self.time_style,
            archive: &mut self.archive,
            index: 0,
        };
        Ok(Box::new(iter.map(|res| {
            res.map(|e| Box::new(e) as Box<dyn ArchiveEntry>)
        })))
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
        let archive = "./tests/archives/dir-entries.zip";
        let time_style = "%y/%m/%d %H:%M:%S";
        let mut zip = Zip::new(archive, time_style)?;
        let mut entries: Vec<Box<dyn ArchiveEntry>> = vec![];
        for entry in zip.entries()? {
            let entry = entry?;
            entries.push(entry);
        }
        assert_eq!(entries[0].path(), nfc("1 ゲーム/"));
        assert_eq!(entries[14].path(), "2 movies/1 action/1 text.txt");
        Ok(())
    }

    #[test]
    fn test_run_error() -> Result<()> {
        let archive = "./tests/archives/nonexistent.zip";
        let time_style = "%y/%m/%d %H:%M:%S";
        let zip = Zip::new(archive, time_style);
        assert!(zip.is_err());
        Ok(())
    }
}
