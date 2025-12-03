use crate::{
    helpers::{decode_string, ls_style_size},
    models::Entry,
};

/// アーカイブ内のエントリを扱うためのトレイト。
pub trait ArchiveEntry {
    /// デフォルトのパーミッション文字列を返す。
    ///
    /// # Returns
    /// デフォルトのパーミッション文字列
    fn default_perm(&self) -> String {
        "----------".to_owned()
    }

    /// デフォルトのファイルサイズを返す。
    ///
    /// # Returns
    /// デフォルトのサイズ (0 バイト)
    fn default_size(&self) -> u64 {
        0
    }

    /// デフォルトのタイムスタンプ文字列を返す。
    ///
    /// # Returns
    /// デフォルトのタイムスタンプ文字列
    fn default_time(&self) -> String {
        "--/--/-- --:--:--".to_owned()
    }

    /// エントリ情報を生成する。
    ///
    /// # Arguments
    /// * `name` - エントリ名
    ///
    /// # Returns
    /// Entry インスタンス
    fn entry(&self, name: &str) -> Entry {
        Entry {
            perm: self.perm(),
            name: name.to_owned(),
            size: ls_style_size(self.size()),
            time: self.time(),
            link: String::new(),
        }
    }

    /// バイト列をパス文字列にデコードする。
    ///
    /// 記述を統一するため、相対パスの場合は `./` は削除する。
    ///
    /// # Arguments
    /// * `raw` - デコードするバイト列
    ///
    /// # Returns
    /// デコードされたパス文字列
    fn decode_path(&self, raw: &[u8]) -> String {
        let s = decode_string(raw);
        if s.starts_with("./") {
            return s.strip_prefix("./").unwrap().to_owned();
        }
        s
    }

    /// パーミッション文字列を返す。
    ///
    /// # Returns
    /// パーミッション文字列
    fn perm(&self) -> String;

    /// パス文字列を返す。
    ///
    /// # Returns
    /// パス文字列
    fn path(&self) -> String;

    /// ファイルサイズを返す。
    ///
    /// # Returns
    /// ファイルサイズ (バイト)
    fn size(&self) -> u64;

    /// タイムスタンプ文字列を返す。
    ///
    /// # Returns
    /// タイムスタンプ文字列
    fn time(&self) -> String;
}
