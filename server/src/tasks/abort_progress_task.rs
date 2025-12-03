use crate::{
    misc::Command,
    models::{TaskArg, TaskControl, TaskResult, TaskStatus},
    traits::TaskBase,
};

use anyhow::Result;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::sync::Arc;
use tokio::sync::mpsc;

/// ProgressTask を中断するタスク。
pub struct AbortProgressTask;

impl AbortProgressTask {
    /// 新しい AbortProgressTask インスタンスを生成する。
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl TaskBase for AbortProgressTask {
    fn validate(&self, cmd: &Command) -> bool {
        self.is_valid_args(&cmd.args)
    }

    fn schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "pid": { "type": "string", "minLength": 1 },
            },
            "required": ["pid"],
            "additionalProperties": false,
        })
    }

    async fn try_run(
        &self,
        cmd: &Command,
        _: &Arc<TaskArg>,
        tx: mpsc::Sender<TaskControl>,
    ) -> Result<TaskResult> {
        let pid = cmd.arg_as_str("pid").unwrap();
        let ctrl = TaskControl {
            pid: pid.to_owned(),
            status: TaskStatus::Abort,
        };
        // 中断のタスク制御メッセージを TaskManager に送信する。
        let res = match tx.send(ctrl).await {
            Ok(_) => TaskResult::success(),
            Err(err) => TaskResult::error(err.into()),
        };
        Ok(res)
    }
}

#[cfg(test)]
mod tests {
    use crate::test_helpers::{
        assert_by_schema, create_command, setup_resources, setup_sender,
        setup_task_arg, teardown_resources,
    };

    use super::*;

    async fn setup() -> Result<(
        String,
        AbortProgressTask,
        mpsc::Sender<TaskControl>,
        mpsc::Receiver<TaskControl>,
    )> {
        let path = setup_resources("").await?;
        let task = AbortProgressTask::new();
        let (tx, rx) = mpsc::channel::<TaskControl>(10);
        Ok((path, task, tx, rx))
    }

    #[tokio::test]
    async fn test_validate_by_schema() -> Result<()> {
        let (path, task, _, _) = setup().await?;
        let fx_path = "./tests/fixtures/abort_progress_task.json";
        assert_by_schema(fx_path, "_", &path, &task).await?;
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_success() -> Result<()> {
        let (path, task, tx, _rx) = setup().await?;
        let sender = setup_sender();
        let task_arg = setup_task_arg(sender);
        let args = json!({ "pid": "test" });
        let cmd = create_command(&path, "_", args)?;
        let TaskResult::Success(_) = task.run(&cmd, &task_arg, tx).await else {
            unreachable!();
        };
        teardown_resources(&path).await?;
        Ok(())
    }
}
