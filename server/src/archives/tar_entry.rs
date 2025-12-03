use crate::{helpers::perm_string, traits::ArchiveEntry};

use chrono::{Local, TimeZone as _};
use std::{borrow::Cow, io::Read, os::unix::ffi::OsStringExt};

/// Tar のエントリを表す構造体。
///
/// # Fields
/// * `time_style` - 日時のフォーマット文字列
/// * `perm` - パーミッション文字列
/// * `path` - エントリのパス
/// * `size` - ファイルサイズ (バイト)
/// * `time` - 最終更新日時
pub struct TarEntry {
    time_style: String,
    perm: String,
    path: String,
    size: u64,
    time: String,
}

impl TarEntry {
    /// 新しい TarEntry インスタンスを作成する。
    ///
    /// # Arguments
    /// * `time_style` - 日時のフォーマット文字列
    ///
    /// # Returns
    /// デフォルト値で初期化された TarEntry インスタンス
    pub fn new(time_style: &str) -> Self {
        let mut ins = Self {
            time_style: time_style.to_owned(),
            perm: String::new(),
            path: String::new(),
            size: 0,
            time: String::new(),
        };
        ins.perm = ins.default_perm();
        ins.size = ins.default_size();
        ins.time = ins.default_time();
        ins
    }

    /// tar::Entry を元にこのインスタンスを初期化する。
    ///
    /// # Arguments
    /// * `file` - tar::Entry の参照
    pub fn init<R: Read>(&mut self, file: &tar::Entry<'_, R>) {
        self.perm = self.get_perm(file);
        self.path = self.get_path(file);
        self.size = self.get_size(file);
        self.time = self.get_time(file);
    }

    /// エントリのパーミッション文字列を取得する。
    ///
    /// 失敗した場合はデフォルトのパーミッション文字列を返す。
    ///
    /// # Arguments
    /// * `file` - tar::Entry の参照
    ///
    /// # Returns
    /// `ls -l` 形式のパーミッション文字列
    /// 例： `-rwxr-xr-x`
    fn get_perm<R: Read>(&self, file: &tar::Entry<'_, R>) -> String {
        let header = file.header();
        let ent_type = header.entry_type();
        let first = if ent_type.is_symlink() {
            'l'
        } else if ent_type.is_dir() {
            'd'
        } else {
            '-'
        };
        let Ok(mode) = header.mode() else {
            return self.default_perm();
        };
        let perm = perm_string(mode);
        format!("{}{}", first, perm)
    }

    /// エントリのパスを取得する。
    ///
    /// # Arguments
    /// * `file` - tar::Entry の参照
    ///
    /// # Returns
    /// デコードされたパス文字列
    fn get_path<R: Read>(&self, file: &tar::Entry<'_, R>) -> String {
        let mut raw = file.header().path_bytes();
        let str_p = String::from_utf8_lossy(&raw);
        // USTAR ではファイル名が 100 バイトに制限されている。
        // 途中で切れていそうなら path() にフォールバックする。
        if raw.len() >= 100 || str_p.contains('\0') {
            if let Ok(path) = file.path() {
                let vec = path.into_owned().into_os_string().into_vec();
                raw = Cow::Owned(vec);
            }
        }
        self.decode_path(&raw)
    }

    /// エントリのサイズを取得する。
    ///
    /// # Arguments
    /// * `file` - tar::Entry の参照
    ///
    /// # Returns
    /// ファイルサイズ (バイト)
    fn get_size<R: Read>(&self, file: &tar::Entry<'_, R>) -> u64 {
        match file.header().size() {
            Ok(s) => s,
            Err(_) => self.default_size(),
        }
    }

    /// エントリの最終更新日時を取得する。
    ///
    /// `time_style` に基づいてフォーマットされる。
    ///
    /// # Arguments
    /// * `file` - tar::Entry の参照
    ///
    /// # Returns
    /// フォーマットされた日時文字列
    fn get_time<R: Read>(&self, file: &tar::Entry<'_, R>) -> String {
        let Ok(ts) = file.header().mtime() else {
            return self.default_time();
        };
        let dt = Local.timestamp_opt(ts as i64, 0).unwrap();
        dt.format(&self.time_style).to_string()
    }
}

impl ArchiveEntry for TarEntry {
    fn perm(&self) -> String {
        self.perm.clone()
    }

    fn path(&self) -> String {
        self.path.clone()
    }

    fn size(&self) -> u64 {
        self.size
    }

    fn time(&self) -> String {
        self.time.clone()
    }
}

#[cfg(test)]
mod tests {
    use std::{fs::File, io::Error};
    use unicode_normalization::UnicodeNormalization as _;

    use super::*;

    fn nfc(s: &str) -> String {
        s.nfc().to_string()
    }

    #[test]
    fn test_run_success() -> anyhow::Result<()> {
        let file = File::open("./tests/archives/dir-entries.tar")?;
        let mut archive = tar::Archive::new(file);
        let entries: Vec<_> =
            archive.entries()?.collect::<Result<Vec<_>, Error>>()?;
        {
            let tar = entries.first().unwrap();
            let mut entry = TarEntry::new("%y/%m/%d %H:%M:%S");
            entry.init(tar);
            assert_eq!(entry.perm(), "drwxr-xr-x");
            assert_eq!(entry.path(), "");
            assert_eq!(entry.size(), 0);
            assert_eq!(entry.time(), "25/06/15 17:30:28");
        }
        {
            let tar = entries.get(1).unwrap();
            let mut entry = TarEntry::new("%y/%m/%d %H:%M:%S");
            entry.init(tar);
            assert_eq!(entry.perm(), "drwxr-xr-x");
            assert_eq!(entry.path(), nfc("1 ゲーム/"));
            assert_eq!(entry.size(), 0);
            assert_eq!(entry.time(), "25/06/15 17:24:25");
        }
        {
            let tar = entries.get(20).unwrap();
            let mut entry = TarEntry::new("%y/%m/%d %H:%M:%S");
            entry.init(tar);
            assert_eq!(entry.perm(), "-rw-r--r--");
            assert_eq!(entry.path(), "2 movies/1 action/1 text.txt");
            assert_eq!(entry.size(), 445);
            assert_eq!(entry.time(), "25/06/15 16:31:23");
        }
        Ok(())
    }
}
