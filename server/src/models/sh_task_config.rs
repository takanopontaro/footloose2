use serde::Deserialize;

/// ShTask の設定を扱う構造体。
///
/// # Fields
/// * `cmd` - 実行するシェルコマンド文字列
#[derive(Deserialize)]
pub struct ShTaskConfig {
    pub cmd: String,
}
