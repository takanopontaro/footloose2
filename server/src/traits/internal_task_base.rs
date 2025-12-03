use crate::models::TaskArg;

use anyhow::Result;
use async_trait::async_trait;
#[cfg(test)]
use mockall::automock;
use std::sync::Arc;

/// 内部タスクの基底トレイト。
#[cfg_attr(test, automock)]
#[async_trait]
pub trait InternalTaskBase: Send + Sync {
    /// 内部タスクを実行する。
    ///
    /// # Arguments
    /// * `arg` - タスク引数
    ///
    /// # Returns
    /// 実行結果
    async fn run(&self, arg: &Arc<TaskArg>) -> Result<()>;
}
