use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize, Deserialize)]
pub struct Entry {
    pub perm: String,
    pub size: String,
    pub time: String,
    pub name: String,
    pub link: String,
}
