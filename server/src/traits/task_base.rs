use crate::{
    errors::TaskError,
    misc::{CmdArgsType, Command},
    models::{TaskArg, TaskControl, TaskResult},
};

use anyhow::Result;
use async_trait::async_trait;
#[cfg(test)]
use mockall::automock;
use serde_json::{json, Value};
use std::sync::Arc;
use tokio::sync::mpsc;

/// タスクの基底トレイト。
#[cfg_attr(test, automock)]
#[async_trait]
pub trait TaskBase: Send + Sync {
    /// コマンド引数が JSON Schema に沿っているかを検証する。
    ///
    /// # Arguments
    /// * `cmd_args` - 検証するコマンド引数
    ///
    /// # Returns
    /// 検証結果
    fn is_valid_args(&self, cmd_args: &CmdArgsType) -> bool {
        let schema = self.schema();
        let instance = json!(cmd_args);
        jsonschema::is_valid(&schema, &instance)
    }

    /// タスクの JSON Schema を返す。
    ///
    /// # Returns
    /// JSON Schema
    fn schema(&self) -> Value;

    /// コマンドの有効性を検証する。
    ///
    /// # Arguments
    /// * `cmd` - 検証するコマンド
    ///
    /// # Returns
    /// 検証結果
    fn validate(&self, cmd: &Command) -> bool;

    /// タスクを実行する (エラーハンドリングなし)。
    ///
    /// # Arguments
    /// * `cmd` - 実行するコマンド
    /// * `arg` - タスク引数
    /// * `tx` - タスク制御メッセージの送信チャネル
    ///   受信側は TaskManager。タスクの中止などに利用される。
    ///
    /// # Returns
    /// 実行結果
    async fn try_run(
        &self,
        cmd: &Command,
        arg: &Arc<TaskArg>,
        tx: mpsc::Sender<TaskControl>,
    ) -> Result<TaskResult>;

    /// タスクを実行する (エラーハンドリングあり)。
    ///
    /// 実行してエラーだった場合は TaskError::Run に共通化する。
    ///
    /// # Arguments
    /// * `cmd` - 実行するコマンド
    /// * `arg` - タスク引数
    /// * `tx` - タスク制御メッセージの送信チャネル
    ///   受信側は TaskManager。タスクの中止などに利用される。
    ///
    /// # Returns
    /// 実行結果
    async fn run(
        &self,
        cmd: &Command,
        arg: &Arc<TaskArg>,
        tx: mpsc::Sender<TaskControl>,
    ) -> TaskResult {
        self.try_run(cmd, arg, tx).await.unwrap_or_else(|err| {
            TaskResult::error(TaskError::Run(err.to_string()).into())
        })
    }
}
