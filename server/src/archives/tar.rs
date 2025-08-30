use crate::{
    archives::TarEntry,
    traits::{Archive, ArchiveEntry, ArchiveEntryIter},
};

use std::{fs::File, io::Result};

pub struct Tar {
    time_style: String,
    archive: tar::Archive<File>,
}

impl Tar {
    pub fn new(path: &str, time_style: &str) -> anyhow::Result<Self> {
        let file = File::open(path)?;
        let archive = tar::Archive::new(file);
        Ok(Self {
            time_style: time_style.to_owned(),
            archive,
        })
    }
}

impl Archive for Tar {
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
        let archive = "./tests/archives/dir-entries.tar";
        let time_style = "%y/%m/%d %H:%M:%S";
        let mut tar = Tar::new(archive, time_style)?;
        let mut entries: Vec<Box<dyn ArchiveEntry>> = vec![];
        for entry in tar.entries()? {
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
        let archive = "./tests/archives/nonexistent.tar";
        let time_style = "%y/%m/%d %H:%M:%S";
        let tar = Tar::new(archive, time_style);
        assert!(tar.is_err());
        Ok(())
    }
}
