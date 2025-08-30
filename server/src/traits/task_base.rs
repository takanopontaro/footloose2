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

#[cfg_attr(test, automock)]
#[async_trait]
pub trait TaskBase: Send + Sync {
    fn is_valid_args(&self, cmd_args: &CmdArgsType) -> bool {
        let schema = self.schema();
        let instance = json!(cmd_args);
        jsonschema::is_valid(&schema, &instance)
    }

    fn schema(&self) -> Value;

    fn validate(&self, cmd: &Command) -> bool;

    async fn try_run(
        &self,
        cmd: &Command,
        arg: &Arc<TaskArg>,
        tx: mpsc::Sender<TaskControl>,
    ) -> Result<TaskResult>;

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
