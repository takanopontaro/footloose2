use crate::models::MimeType;

use serde::Deserialize;

/// クライアントの設定を表す構造体。
///
/// # Fields
/// * `mime_types` - MIME タイプの設定
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientConfig {
    pub mime_types: Vec<MimeType>,
}
