use serde::Deserialize;

/// MIME タイプを表す構造体。
///
/// # Fields
/// * `mime` - MIME タイプ
/// * `pattern` - 拡張子の正規表現パターン
#[derive(Deserialize)]
pub struct MimeType {
    pub mime: String,
    pub pattern: String,
}
