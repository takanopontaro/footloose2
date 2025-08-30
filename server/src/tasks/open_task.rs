use crate::{
    misc::Command,
    models::{TaskArg, TaskControl, TaskResult},
    traits::TaskBase,
};

use anyhow::Result;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::sync::Arc;
use tokio::sync::mpsc;

pub struct OpenTask;

impl OpenTask {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl TaskBase for OpenTask {
    fn validate(&self, cmd: &Command) -> bool {
        self.is_valid_args(&cmd.args)
            && cmd.arg_as_path("path", &cmd.cwd).is_some()
    }

    fn schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "path": { "type": "string", "minLength": 1 },
                "app": { "type": "string", "minLength": 1 },
            },
            "required": ["path"],
            "additionalProperties": false,
        })
    }

    async fn try_run(
        &self,
        cmd: &Command,
        _: &Arc<TaskArg>,
        _: mpsc::Sender<TaskControl>,
    ) -> Result<TaskResult> {
        let path = cmd.arg_as_path("path", &cmd.cwd).unwrap();
        let res = match cmd.arg_as_str("app") {
            Some(app) => open::with(path, app),
            None => open::that(path),
        };
        let res = match res {
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

    async fn setup(
    ) -> Result<(String, Arc<TaskArg>, OpenTask, mpsc::Sender<TaskControl>)>
    {
        let path = setup_resources("").await?;
        let sender = setup_sender();
        let task_arg = setup_task_arg(sender);
        let task = OpenTask::new();
        let (tx, _) = mpsc::channel::<TaskControl>(10);
        Ok((path, task_arg, task, tx))
    }

    #[tokio::test]
    async fn test_validate_by_schema() -> Result<()> {
        let (path, _task_arg, task, _) = setup().await?;
        let fx_path = "./tests/fixtures/open_task.json";
        assert_by_schema(fx_path, "_", &path, &task).await?;
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_open_that_error() -> Result<()> {
        let (path, task_arg, task, tx) = setup().await?;
        let args = json!({ "path": "👟/nonexistent.txt" });
        let cmd = create_command("", "_", args)?;
        let res = task.run(&cmd, &task_arg, tx).await;
        assert!(matches!(res, TaskResult::Error(_)));
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_open_with_error() -> Result<()> {
        let (path, task_arg, task, tx) = setup().await?;
        let args = json!({ "path": "👟/test.txt", "app": "nonexistent-app" });
        let cmd = create_command("", "_", args)?;
        let res = task.run(&cmd, &task_arg, tx).await;
        assert!(matches!(res, TaskResult::Error(_)));
        teardown_resources(&path).await?;
        Ok(())
    }
}
