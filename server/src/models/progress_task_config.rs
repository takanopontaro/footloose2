use serde::Deserialize;

/// ProgressTask の設定を扱う構造体。
///
/// クライアントから送信されるメッセージに含まれている。
///
/// # Fields
/// * `cmd` - 実行するコマンド文字列
/// * `total` - 処理対象エントリの総数を算出するコマンド文字列
#[derive(Deserialize)]
pub struct ProgressTaskConfig {
    pub cmd: String,
    pub total: String,
}
