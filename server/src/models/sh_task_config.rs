use serde::Deserialize;

#[derive(Deserialize)]
pub struct ShTaskConfig {
    pub cmd: String,
}
