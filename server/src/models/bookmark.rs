use serde::{Deserialize, Serialize};

/// ブックマークを表す構造体。
///
/// # Fields
/// * `name` - ブックマークの名前
/// * `path` - ブックマークのパス
#[derive(Serialize, Deserialize)]
pub struct Bookmark {
    pub name: String,
    pub path: String,
}
