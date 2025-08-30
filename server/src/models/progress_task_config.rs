use serde::Deserialize;

#[derive(Deserialize)]
pub struct ProgressTaskConfig {
    pub cmd: String,
    pub total: String,
}
