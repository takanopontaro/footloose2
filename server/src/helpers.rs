//! ヘルパー関数を提供するモジュール。

use crate::models::Entry;

use anyhow::Result;
use chardetng::EncodingDetector;
use chrono::{Local, TimeZone as _};
use shellexpand::tilde;
use std::{
    fs::{self, Metadata},
    os::unix::fs::MetadataExt as _,
    path::{Path, PathBuf},
};
use unicode_normalization::UnicodeNormalization as _;

/// バイト列を文字列にデコードする。
///
/// 結果は Unicode 正規化 (NFC) される。
///
/// # Arguments
/// * `raw` - デコード対象のバイト列
///
/// # Returns
/// Unicode 正規化 (NFC) されたデコード文字列
pub fn decode_string(raw: &[u8]) -> String {
    // まず UTF-8 を試す。
    if let Ok(s) = std::str::from_utf8(raw) {
        return s.nfc().to_string();
    }
    // UTF-8 でなければ文字コードを自動判定してデコードする。
    let mut detector = EncodingDetector::new();
    detector.feed(raw, true);
    let encoding = detector.guess(None, true);
    let (decoded, _, _) = encoding.decode(raw);
    decoded.into_owned()
}

/// ファイルサイズを ls コマンド風の文字列に変換する。
///
/// # Arguments
/// * `bytes` - ファイルサイズ
///
/// # Returns
/// ls 風のサイズ文字列
/// 例： `1.5K`, `2.3M`
pub fn ls_style_size(bytes: u64) -> String {
    const UNITS: [&str; 5] = ["B", "K", "M", "G", "T"];
    let mut size = bytes as f64;
    let mut unit = 0;
    while size >= 1024.0 && unit < UNITS.len() - 1 {
        size /= 1024.0;
        unit += 1;
    }
    // 1024 バイト未満はそのまま、
    // それ以上は適切な単位を付与して小数第一位までを返す。
    if unit == 0 {
        format!("{}", size as u64)
    } else {
        format!("{:.1}{}", size, UNITS[unit])
    }
}

/// UNIX ファイルモードをパーミッション文字列に変換する。
///
/// 先頭一文字目のファイルタイプは含まない。
///
/// # Arguments
/// * `mode` - ファイルモード
///
/// # Returns
/// UNIX 形式のパーミッション文字列
/// 例： `rwxr-xr-x`
pub fn perm_string(mode: u32) -> String {
    let mut res = "".to_owned();
    let perms = [
        (mode & 0o400, 'r'),
        (mode & 0o200, 'w'),
        (mode & 0o100, 'x'),
        (mode & 0o040, 'r'),
        (mode & 0o020, 'w'),
        (mode & 0o010, 'x'),
        (mode & 0o004, 'r'),
        (mode & 0o002, 'w'),
        (mode & 0o001, 'x'),
    ];
    for (bit, ch) in perms {
        res.push(if bit != 0 { ch } else { '-' });
    }
    res
}

/// メタデータからパーミッション文字列を生成する。
///
/// 先頭一文字目はファイルタイプを表す。
///
/// # Arguments
/// * `meta` - ファイルのメタデータ
///
/// # Returns
/// `ls -l` 形式のパーミッション文字列
/// 例： `drwxr-xr-x`
pub fn perm_string_from_meta(meta: &Metadata) -> String {
    let first = if meta.is_symlink() {
        'l'
    } else if meta.is_dir() {
        'd'
    } else {
        '-'
    };
    let mode = meta.mode();
    let perm = perm_string(mode);
    format!("{}{}", first, perm)
}

/// 親ディレクトリを表すエントリを作成する。
///
/// 名前は常に `..` となる。
///
/// # Arguments
/// * `path` - 対象エントリのパス
/// * `time_style` - 日時のフォーマット文字列
/// * `is_virtual` - 仮想ディレクトリ内のエントリか否か
///
/// # Returns
/// 親ディレクトリを表すエントリ
pub fn parent_entry(
    path: &str,
    time_style: &str,
    is_virtual: bool,
) -> Result<Entry> {
    // 親のパスを取得する。自身がルートディレクトリの場合、親はルート自身となる。
    let p = Path::new(path).parent().unwrap_or_else(|| Path::new("/"));
    let meta = fs::metadata(p)?;
    let dt = Local.timestamp_opt(meta.ctime(), 0).unwrap();
    let ent = Entry {
        perm: perm_string_from_meta(&meta),
        size: "0".to_owned(),
        time: dt.format(time_style).to_string(),
        name: "..".to_owned(),
        link: "".to_owned(),
        is_virtual,
    };
    Ok(ent)
}

/// 絶対パスを正規化する。
///
/// 具体的には `.` と `..` を解決する。
/// 解決した結果、ルートを超えた場合は `/` が返る。
///
/// # Arguments
/// * `path` - 正規化する絶対パス
///
/// # Returns
/// 正規化されたパス
pub fn normalize_path(path: &str) -> String {
    let mut components = vec![];
    for part in path.split('/') {
        match part {
            "" | "." => continue,
            ".." => {
                components.pop();
            }
            _ => components.push(part),
        }
    }
    format!("/{}", components.join("/"))
}

/// 相対パスを絶対パスに変換する。
///
/// `.` は正規化するが `..` はそのまま残す。
/// チルダ `~` はホームディレクトリに展開する。
/// `cwd` が空の場合はそのまま返す (チルダは展開する)。
///
/// # Arguments
/// * `path` - 変換するパス
/// * `cwd` - 基準となるディレクトリ
///
/// # Returns
/// 変換された絶対パス
pub fn absolutize_path(path: &str, cwd: &str) -> String {
    let t = tilde(path).to_string();
    let p = Path::new(&t);
    let c = Path::new(cwd);
    if p.is_absolute() || cwd.is_empty() {
        return p.to_string_lossy().to_string();
    }
    c.join(p)
        .components()
        .collect::<PathBuf>()
        .to_string_lossy()
        .to_string()
}

/// 複数のパスを絶対パスに変換する。
///
/// # Arguments
/// * `paths` - 変換するパスの配列
/// * `cwd` - 基準となるディレクトリ
///
/// # Returns
/// 絶対パスの配列
pub fn _absolutize_paths(paths: &[String], cwd: &str) -> Vec<String> {
    paths.iter().map(|p| absolutize_path(p, cwd)).collect()
}

/// 絶対パスを相対パスに変換する。
///
/// チルダ `~` はホームディレクトリに展開する。
/// `cwd` が空または相対パスの場合はそのまま返す (チルダは展開する)。
///
/// # Arguments
/// * `path` - 変換するパス
/// * `cwd` - 基準となるディレクトリ
///
/// # Returns
/// `cwd` からの相対パス
/// `cwd` と同じなら `.` を返す。
pub fn relativize_path(path: &str, cwd: &str) -> String {
    let t = tilde(path).to_string();
    let p = Path::new(&t);
    let c = Path::new(cwd);
    if cwd.is_empty() || c.is_relative() || p.is_relative() {
        return path.to_owned();
    }
    let s = p.strip_prefix(c).unwrap_or(p).to_string_lossy().to_string();
    if s.is_empty() {
        ".".to_owned()
    } else {
        s
    }
}

/// 複数のパスを相対パスに変換する。
///
/// # Arguments
/// * `paths` - 変換するパスの配列
/// * `cwd` - 基準となるディレクトリ
///
/// # Returns
/// 相対パスの配列
pub fn relativize_paths(paths: &[String], cwd: &str) -> Vec<String> {
    paths.iter().map(|p| relativize_path(p, cwd)).collect()
}

/// パスをクォートしてスペース区切りの文字列に変換する。
///
/// シェルコマンドでの使用を想定している。
/// 特殊文字は適切にエスケープされる。
///
/// # Arguments
/// * `paths` - クォートするパスの配列
///
/// # Returns
/// スペース区切りのクォート済みパス文字列
pub fn quote_paths(paths: &[String]) -> String {
    paths
        .iter()
        // クォートと特殊文字のエスケープを同時に行う。
        .map(|s| serde_json::to_string(s).unwrap())
        .collect::<Vec<String>>()
        .join(" ")
}

/// アプリケーションロゴを表示する (ANSI Regular)。
pub fn _logo_ansi_regular() {
    let logo = r"

███████  ██████   ██████  ████████ ██       ██████   ██████  ███████ ███████     ██████
██      ██    ██ ██    ██    ██    ██      ██    ██ ██    ██ ██      ██               ██
█████   ██    ██ ██    ██    ██    ██      ██    ██ ██    ██ ███████ █████        █████
██      ██    ██ ██    ██    ██    ██      ██    ██ ██    ██      ██ ██          ██
██       ██████   ██████     ██    ███████  ██████   ██████  ███████ ███████     ███████

                                   Here 🕺 We 💃 Go 👟

";
    print!("{logo}");
}

/// アプリケーションロゴを表示する (ANSI Shadow)。
pub fn _logo_ansi_shadow() {
    let logo = r"

███████╗ ██████╗  ██████╗ ████████╗██╗      ██████╗  ██████╗ ███████╗███████╗    ██████╗
██╔════╝██╔═══██╗██╔═══██╗╚══██╔══╝██║     ██╔═══██╗██╔═══██╗██╔════╝██╔════╝    ╚════██╗
█████╗  ██║   ██║██║   ██║   ██║   ██║     ██║   ██║██║   ██║███████╗█████╗       █████╔╝
██╔══╝  ██║   ██║██║   ██║   ██║   ██║     ██║   ██║██║   ██║╚════██║██╔══╝      ██╔═══╝
██║     ╚██████╔╝╚██████╔╝   ██║   ███████╗╚██████╔╝╚██████╔╝███████║███████╗    ███████╗
╚═╝      ╚═════╝  ╚═════╝    ╚═╝   ╚══════╝ ╚═════╝  ╚═════╝ ╚══════╝╚══════╝    ╚══════╝

                                   Here 🕺 We 💃 Go 👟

";
    print!("{logo}");
}

/// アプリケーションロゴを表示する (Standard)。
pub fn logo_standard() {
    let logo = r"
  _____           _   _                        ____
 |  ___|__   ___ | |_| | ___   ___  ___  ___  |___ \
 | |_ / _ \ / _ \| __| |/ _ \ / _ \/ __|/ _ \   __) |
 |  _| (_) | (_) | |_| | (_) | (_) \__ \  __/  / __/
 |_|  \___/ \___/ \__|_|\___/ \___/|___/\___| |_____|

                 Here 🕺 We 💃 Go 👟

";
    print!("{logo}");
}

/// アプリケーションロゴを表示する (Big)。
pub fn _logo_big() {
    let logo = r"
  ______          _   _                        ___
 |  ____|        | | | |                      |__ \
 | |__ ___   ___ | |_| | ___   ___  ___  ___     ) |
 |  __/ _ \ / _ \| __| |/ _ \ / _ \/ __|/ _ \   / /
 | | | (_) | (_) | |_| | (_) | (_) \__ \  __/  / /_
 |_|  \___/ \___/ \__|_|\___/ \___/|___/\___| |____|

                 Here 🕺 We 💃 Go 👟

";
    print!("{logo}");
}

#[cfg(test)]
mod tests {
    use crate::test_helpers::{setup_resources, teardown_resources};

    use anyhow::Result;
    use std::{env, fs, os::unix::fs::MetadataExt};

    use super::*;

    #[test]
    fn test_decode_string() {
        let utf8_nfc = "テスト".as_bytes();
        assert_eq!(decode_string(utf8_nfc), "テスト");
        let utf8_nfd = "テ\u{3099}ススト".as_bytes();
        assert_eq!(decode_string(utf8_nfd), "デススト");
        let sjis = &[0x83, 0x65, 0x83, 0x58, 0x83, 0x67];
        assert_eq!(decode_string(sjis), "テスト");
    }

    #[tokio::test]
    async fn test_ls_style_size() -> Result<()> {
        let path = setup_resources("").await?;
        assert_eq!(ls_style_size(0), "0");
        assert_eq!(ls_style_size(1), "1");
        assert_eq!(ls_style_size(512), "512");
        assert_eq!(ls_style_size(1023), "1023");
        assert_eq!(ls_style_size(1024), "1.0K");
        assert_eq!(ls_style_size(1536), "1.5K");
        assert_eq!(ls_style_size(10 * 1024), "10.0K");
        assert_eq!(ls_style_size(1024 * 1024), "1.0M");
        assert_eq!(ls_style_size(5 * 1024 * 1024), "5.0M");
        assert_eq!(ls_style_size(1024_u64.pow(3)), "1.0G");
        assert_eq!(ls_style_size(15 * 1024_u64.pow(3)), "15.0G");
        assert_eq!(ls_style_size(1024_u64.pow(4)), "1.0T");
        assert_eq!(ls_style_size(3 * 1024_u64.pow(4)), "3.0T");
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_perm_string() -> Result<()> {
        let path = setup_resources("").await?;
        let meta = fs::metadata(format!("{path}/test1/test1.txt"))?;
        assert_eq!(perm_string(meta.mode()), "rw-r--r--");
        let meta = fs::metadata(format!("{path}/test2/test2.txt"))?;
        assert_eq!(perm_string(meta.mode()), "rwxr-xr-x");
        let meta = fs::metadata(format!("{path}/test.txt"))?;
        assert_eq!(perm_string(meta.mode()), "rwxrwxrwx");
        let meta = fs::metadata(format!("{path}/test3"))?;
        assert_eq!(perm_string(meta.mode()), "rwxrwxrwx");
        let meta = fs::symlink_metadata(format!("{path}/test1.txt's link"))?;
        assert_eq!(perm_string(meta.mode()), "rwxr-xr-x");
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_perm_string_from_meta() -> Result<()> {
        let path = setup_resources("").await?;
        let meta = fs::metadata(format!("{path}/test1/test1.txt"))?;
        assert_eq!(perm_string_from_meta(&meta), "-rw-r--r--");
        let meta = fs::metadata(format!("{path}/test2/test2.txt"))?;
        assert_eq!(perm_string_from_meta(&meta), "-rwxr-xr-x");
        let meta = fs::metadata(format!("{path}/test.txt"))?;
        assert_eq!(perm_string_from_meta(&meta), "-rwxrwxrwx");
        let meta = fs::metadata(format!("{path}/test3"))?;
        assert_eq!(perm_string_from_meta(&meta), "drwxrwxrwx");
        let meta = fs::symlink_metadata(format!("{path}/test1.txt's link"))?;
        assert_eq!(perm_string_from_meta(&meta), "lrwxr-xr-x");
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_parent_entry() -> Result<()> {
        let path = setup_resources("").await?;
        let time_style = "%Y/%m/%d %H:%M:%S";
        let p = format!("{path}/test1/test1.txt");
        let ent = parent_entry(&p, time_style, false).unwrap();
        assert_eq!(ent.perm, "drwxrw-rw-");
        assert_eq!(ent.name, "..");
        let p = format!("{path}/test2/test2.txt");
        let ent = parent_entry(&p, time_style, false).unwrap();
        assert_eq!(ent.perm, "drwxrwxrwx");
        assert_eq!(ent.name, "..");
        let p = "/".to_owned();
        let ent = parent_entry(&p, time_style, false).unwrap();
        assert_eq!(ent.name, "..");
        teardown_resources(&path).await?;
        Ok(())
    }

    #[test]
    fn test_normalize_path() {
        assert_eq!(normalize_path("/aa/bb/cc/dd/ee"), "/aa/bb/cc/dd/ee");
        assert_eq!(normalize_path("/aa/bb/cc/dd/ee/"), "/aa/bb/cc/dd/ee");
        assert_eq!(normalize_path("/aa/bb/cc/dd/ee/.."), "/aa/bb/cc/dd");
        assert_eq!(normalize_path("/aa/bb/cc/dd/../ee"), "/aa/bb/cc/ee");
        assert_eq!(normalize_path("/aa/bb/cc/dd/./ee"), "/aa/bb/cc/dd/ee");
        assert_eq!(normalize_path("/aa/bb/./cc/../dd"), "/aa/bb/dd");
        assert_eq!(normalize_path("/aa/bb/cc/../../dd"), "/aa/dd");
        assert_eq!(normalize_path("/aa/.."), "/");
        assert_eq!(normalize_path("/aa/bb/../../../../.."), "/");
    }

    #[test]
    fn test_absolutize_path() {
        if let Ok(home) = env::var("HOME") {
            assert_eq!(
                absolutize_path("~/foo/bar", "/baz"),
                format!("{}/foo/bar", home)
            );
        }
        assert_eq!(absolutize_path("/foo/bar", "/baz"), "/foo/bar");
        assert_eq!(absolutize_path("foo/bar", "/baz"), "/baz/foo/bar");
        assert_eq!(absolutize_path("./foo/bar", "/baz"), "/baz/foo/bar");
        assert_eq!(
            absolutize_path("../foo/bar", "/baz/qux"),
            "/baz/qux/../foo/bar"
        );
        assert_eq!(absolutize_path("foo/./bar", "/baz"), "/baz/foo/bar");
        assert_eq!(absolutize_path("", "/baz"), "/baz");
        assert_eq!(absolutize_path("foo/bar", ""), "foo/bar");
        assert_eq!(absolutize_path("/foo/bar", ""), "/foo/bar");
        assert_eq!(absolutize_path("./foo/bar", ""), "./foo/bar");
        assert_eq!(absolutize_path("../foo/bar", ""), "../foo/bar");
    }

    #[test]
    fn test_absolutize_paths() {
        let paths = &[
            "/foo/bar".to_owned(),
            "foo/bar".to_owned(),
            "./foo/bar".to_owned(),
            "../foo/bar".to_owned(),
        ];
        let expected = vec![
            "/foo/bar".to_owned(),
            "/baz/foo/bar".to_owned(),
            "/baz/foo/bar".to_owned(),
            "/baz/../foo/bar".to_owned(),
        ];
        assert_eq!(_absolutize_paths(paths, "/baz"), expected);
    }

    #[test]
    fn test_relativize_path() {
        if let Ok(home) = env::var("HOME") {
            assert_eq!(relativize_path("~/foo/bar", &home), "foo/bar");
        }
        assert_eq!(relativize_path("/foo/bar", "/foo"), "bar");
        assert_eq!(relativize_path("/foo/bar/baz", "/foo"), "bar/baz");
        assert_eq!(relativize_path("/foo/bar", "/baz"), "/foo/bar");
        assert_eq!(relativize_path("/foo/bar", ""), "/foo/bar");
        assert_eq!(relativize_path("foo/bar", "/foo"), "foo/bar");
        assert_eq!(relativize_path("/foo/bar", "foo"), "/foo/bar");
    }

    #[test]
    fn test_relativize_paths() {
        let paths = &[
            "/foo/bar".to_owned(),
            "/foo/bar/baz".to_owned(),
            "/baz/qux".to_owned(),
        ];
        let expected = vec![
            "bar".to_owned(),
            "bar/baz".to_owned(),
            "/baz/qux".to_owned(),
        ];
        assert_eq!(relativize_paths(paths, "/foo"), expected);
    }

    #[tokio::test]
    async fn test_quote_paths() {
        let paths = &["foobar".to_owned()];
        assert_eq!(quote_paths(paths), "\"foobar\"");
        let paths = &["foo bar".to_owned()];
        assert_eq!(quote_paths(paths), "\"foo bar\"");
        let paths = &["fo\\o\"b'ar".to_owned()];
        assert_eq!(quote_paths(paths), r#""fo\\o\"b'ar""#);
        let paths = &["foobar".to_owned(), "foo bar".to_owned()];
        assert_eq!(quote_paths(paths), "\"foobar\" \"foo bar\"");
    }
}
