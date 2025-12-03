use crate::{helpers::perm_string, traits::ArchiveEntry};

use chrono::{Local, NaiveDate, NaiveDateTime, TimeZone as _};
use zip::{read::ZipFile, ExtraField::ExtendedTimestamp};

/// Zip のエントリを表す構造体。
///
/// # Fields
/// * `time_style` - 日時のフォーマット文字列
/// * `perm` - パーミッション文字列
/// * `path` - エントリのパス
/// * `size` - ファイルサイズ (バイト)
/// * `time` - 最終更新日時
pub struct ZipEntry {
    time_style: String,
    perm: String,
    path: String,
    size: u64,
    time: String,
}

impl ZipEntry {
    /// 新しい ZipEntry インスタンスを作成する。
    ///
    /// # Arguments
    /// * `time_style` - 日時のフォーマット文字列
    ///
    /// # Returns
    /// デフォルト値で初期化された ZipEntry インスタンス
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

    /// ZipFile を元にこのインスタンスを初期化する。
    ///
    /// # Arguments
    /// * `file` - ZipFile の参照
    pub fn init(&mut self, file: &ZipFile) {
        self.perm = self.get_perm(file);
        self.path = self.get_path(file);
        self.size = self.get_size(file);
        self.time = self.get_time(file);
    }

    /// タイムゾーン付き変更時刻を取得する。
    ///
    /// `time_style` に基づいてフォーマットされる。
    ///
    /// # Arguments
    /// * `file` - ZipFile の参照
    ///
    /// # Returns
    /// フォーマットされた日時文字列または None
    fn mtime_with_tz(&self, file: &ZipFile) -> Option<String> {
        for field in file.extra_data_fields() {
            if let ExtendedTimestamp(ts) = field {
                let secs = ts.mod_time()?.into();
                let dt = Local.timestamp_opt(secs, 0).unwrap();
                let time = dt.format(&self.time_style).to_string();
                return Some(time);
            }
        }
        None
    }

    /// タイムゾーンなしの変更時刻を取得する。
    ///
    /// # Arguments
    /// * `file` - ZipFile の参照
    ///
    /// # Returns
    /// NaiveDateTime オブジェクト
    fn naive_time(&self, file: &ZipFile) -> Option<NaiveDateTime> {
        let dt = file.last_modified()?;
        let naive = NaiveDate::from_ymd_opt(
            dt.year() as i32,
            dt.month() as u32,
            dt.day() as u32,
        )?
        .and_hms_opt(
            dt.hour() as u32,
            dt.minute() as u32,
            dt.second() as u32,
        )?;
        Some(naive)
    }

    /// エントリのパーミッション文字列を取得する。
    ///
    /// # Arguments
    /// * `file` - ZipFile の参照
    ///
    /// # Returns
    /// `ls -l` 形式のパーミッション文字列
    /// 例： `drwxr-xr-x`
    fn get_perm(&self, file: &ZipFile) -> String {
        let first = if file.is_symlink() {
            'l'
        } else if file.is_dir() {
            'd'
        } else {
            '-'
        };
        let Some(mode) = file.unix_mode() else {
            return self.default_perm();
        };
        let perm = perm_string(mode);
        format!("{}{}", first, perm)
    }

    /// エントリのパスを取得する。
    ///
    /// # Arguments
    /// * `file` - ZipFile の参照
    ///
    /// # Returns
    /// デコードされたパス文字列
    fn get_path(&self, file: &ZipFile) -> String {
        let raw = file.name_raw();
        self.decode_path(raw)
    }

    /// エントリのサイズを取得する。
    ///
    /// # Arguments
    /// * `file` - ZipFile の参照
    ///
    /// # Returns
    /// ファイルサイズ (バイト)
    fn get_size(&self, file: &ZipFile) -> u64 {
        file.size()
    }

    /// エントリの最終更新日時を取得する。
    ///
    /// `time_style` に基づいてフォーマットされる。
    ///
    /// 取得優先度は以下の通り。
    /// 1. タイムゾーン付き
    /// 2. タイムゾーンなし
    /// 3. デフォルト値
    ///
    /// # Arguments
    /// * `file` - ZipFile の参照
    ///
    /// # Returns
    /// フォーマットされた日時文字列
    fn get_time(&self, file: &ZipFile) -> String {
        if let Some(mtime) = self.mtime_with_tz(file) {
            return mtime;
        }
        if let Some(naive) = self.naive_time(file) {
            return naive.format(&self.time_style).to_string();
        }
        self.default_time()
    }
}

impl ArchiveEntry for ZipEntry {
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
    use std::{fs::File, io::BufReader};
    use unicode_normalization::UnicodeNormalization as _;
    use zip::ZipArchive;

    use super::*;

    fn nfc(s: &str) -> String {
        s.nfc().to_string()
    }

    #[test]
    fn test_run_success() -> anyhow::Result<()> {
        let file = File::open("./tests/archives/dir-entries.zip")?;
        let reader = BufReader::new(file);
        let mut archive = ZipArchive::new(reader)?;
        {
            let zip = archive.by_index_raw(0)?;
            let mut entry = ZipEntry::new("%y/%m/%d %H:%M:%S");
            entry.init(&zip);
            assert_eq!(entry.perm(), "drwxr-xr-x");
            assert_eq!(entry.path(), nfc("1 ゲーム/"));
            assert_eq!(entry.size(), 0);
            assert_eq!(entry.time(), "25/06/15 17:24:25");
        }
        {
            let zip = archive.by_index_raw(14)?;
            let mut entry = ZipEntry::new("%y/%m/%d %H:%M:%S");
            entry.init(&zip);
            assert_eq!(entry.perm(), "-rw-r--r--");
            assert_eq!(entry.path(), "2 movies/1 action/1 text.txt");
            assert_eq!(entry.size(), 445);
            assert_eq!(entry.time(), "25/06/15 16:31:23");
        }
        Ok(())
    }
}
