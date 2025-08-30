use crate::{
    helpers::{decode_string, ls_style_size},
    models::Entry,
};

pub trait ArchiveEntry {
    fn default_perm(&self) -> String {
        "----------".to_owned()
    }

    fn default_size(&self) -> u64 {
        0
    }

    fn default_time(&self) -> String {
        "--/--/-- --:--:--".to_owned()
    }

    fn entry(&self, name: &str) -> Entry {
        Entry {
            perm: self.perm(),
            name: name.to_owned(),
            size: ls_style_size(self.size()),
            time: self.time(),
            link: String::new(),
        }
    }

    fn decode_path(&self, raw: &[u8]) -> String {
        let s = decode_string(raw);
        if s.starts_with("./") {
            return s.strip_prefix("./").unwrap().to_owned();
        }
        s
    }

    fn perm(&self) -> String;

    fn path(&self) -> String;

    fn size(&self) -> u64;

    fn time(&self) -> String;
}
