use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct Bookmark {
    pub name: String,
    pub path: String,
}
