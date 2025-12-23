use serde::{Deserialize, Serialize};

/// エントリを表す構造体。
///
/// # Fields
/// * `perm` - パーミッション文字列
/// * `size` - ファイルサイズ (バイト)
/// * `time` - 最終変更日時文字列
/// * `name` - エントリ名
/// * `link` - シンボリックリンクの実体パス
///   リンクでない場合は空文字列。
/// * `is_virtual` - 仮想ディレクトリ内のエントリか否か
#[derive(Clone, Serialize, Deserialize)]
pub struct Entry {
    pub perm: String,
    pub size: String,
    pub time: String,
    pub name: String,
    pub link: String,
    pub is_virtual: bool,
}
