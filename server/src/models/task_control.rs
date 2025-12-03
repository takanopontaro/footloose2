/// タスクの状態を表す列挙型。
///
/// # Variants
/// * `End` - 正常終了
/// * `Abort` - 中止
#[derive(PartialEq)]
pub enum TaskStatus {
    End,
    Abort,
}

/// タスクの制御情報を扱う構造体。
///
/// # Fields
/// * `pid` - プロセス ID
/// * `status` - タスクの状態
pub struct TaskControl {
    pub pid: String,
    pub status: TaskStatus,
}
