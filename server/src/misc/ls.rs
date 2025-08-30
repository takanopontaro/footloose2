use crate::{
    helpers::{ls_style_size, parent_entry, perm_string_from_meta},
    models::Entry,
};

use anyhow::Result;
use chrono::{Local, TimeZone as _};
use std::{
    ffi::OsStr,
    fs::{self},
    os::unix::fs::MetadataExt as _,
    path::Path,
    vec,
};
use unicode_normalization::UnicodeNormalization as _;

pub struct Ls {
    time_style: String,
}

impl Ls {
    pub fn new(time_style: &str) -> Self {
        Self {
            time_style: time_style.to_owned(),
        }
    }

    fn to_nfc_string(&self, path: &Path) -> String {
        path.to_string_lossy().nfc().collect::<String>()
    }

    fn entry_skeleton(&self, path: &OsStr) -> Entry {
        Entry {
            perm: "----------".to_owned(),
            size: "0".to_owned(),
            time: "--/--/-- --:--:--".to_owned(),
            name: self.to_nfc_string(Path::new(path)),
            link: "".to_owned(),
        }
    }

    fn resolve_symlink(&self, path: &Path) -> String {
        let Ok(path) = fs::read_link(path) else {
            return "".to_owned();
        };
        let p = self.to_nfc_string(&path);
        let Ok(meta) = fs::metadata(&p) else {
            return format!("e:{p}");
        };
        if meta.is_dir() {
            return format!("d:{p}");
        }
        if meta.is_file() {
            return format!("f:{p}");
        }
        if meta.is_symlink() {
            return self.resolve_symlink(Path::new(&p));
        }
        "".to_owned()
    }

    pub fn entries(&self, path: &str) -> Result<Vec<Entry>> {
        let mut res = vec![];
        let ent = parent_entry(path, &self.time_style)?;
        res.push(ent);
        let mut entries: Vec<_> = fs::read_dir(path)?.flatten().collect();
        entries.sort_by_key(|e| e.file_name());
        for entry in entries {
            let mut ent = self.entry_skeleton(&entry.file_name());
            let Ok(meta) = entry.metadata() else {
                res.push(ent);
                continue;
            };
            ent.perm = perm_string_from_meta(&meta);
            ent.size = ls_style_size(meta.len());
            let dt = Local.timestamp_opt(meta.ctime(), 0).unwrap();
            ent.time = dt.format(&self.time_style).to_string();
            if meta.is_symlink() {
                ent.link = self.resolve_symlink(&entry.path());
            }
            res.push(ent);
        }
        Ok(res)
    }

    pub fn signature(&self, path: &str) -> Result<String> {
        let mut sig = String::new();
        for entry in fs::read_dir(path)?.flatten() {
            let Ok(meta) = entry.metadata() else {
                continue;
            };
            let secs = meta.ctime();
            let nanos = meta.ctime_nsec();
            sig += &format!("{}{}", secs, nanos);
        }
        Ok(sig)
    }
}

#[cfg(test)]
mod tests {
    use crate::test_helpers::{setup_resources, teardown_resources};

    use super::*;

    #[tokio::test]
    async fn test_ls_entries() -> Result<()> {
        let path = setup_resources("").await?;
        let ls = Ls::new("%y/%m/%d %H:%M:%S");
        let entries = ls.entries(&path)?;
        assert_eq!(entries.len(), 6);
        assert_eq!(entries[0].name, "..");
        assert_eq!(entries[0].size, "0");
        assert_eq!(entries[1].name, "test.txt");
        assert_eq!(entries[2].name, "test1");
        assert_eq!(entries[3].name, "test1.txt's link");
        assert_eq!(entries[3].link, format!("f:{path}/test1/test1.txt"));
        assert_eq!(entries[4].name, "test2");
        assert_eq!(entries[5].name, "test3");
        teardown_resources(&path).await?;
        Ok(())
    }

    #[test]
    fn test_ls_signature() -> Result<()> {
        let ls = Ls::new("%y/%m/%d %H:%M:%S");
        let sig = ls.signature(".")?;
        assert!(!sig.is_empty());
        Ok(())
    }
}
