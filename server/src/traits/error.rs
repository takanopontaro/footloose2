use std::fmt::{Debug, Display};

/// エラーコードを扱うためのトレイト。
pub trait ErrorCode: Debug + Display + Send + Sync {
    /// エラーコードを返す。
    ///
    /// # Returns
    /// エラーコード
    fn code(&self) -> &str;
}
