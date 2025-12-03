/// 監視の状態を表す列挙型。
///
/// # Variants
/// * `Abort` - 中止
#[derive(Debug, PartialEq)]
pub enum WatchStatus {
    Abort,
}

/// 監視の制御情報を扱う構造体。
///
/// # Fields
/// * `path` - 監視対象のパス
/// * `status` - 監視の状態
pub struct WatchControl {
    pub path: String,
    pub status: WatchStatus,
}
