use crate::{
    managers::WatchManagerTrait,
    misc::Command,
    models::{TaskArg, TaskControl, TaskResult},
    traits::TaskBase,
};

use anyhow::Result;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};

pub struct ChangeDirTask<T: WatchManagerTrait> {
    watch_manager: Arc<Mutex<T>>,
}

impl<T: WatchManagerTrait> ChangeDirTask<T> {
    pub fn new(watch_manager: Arc<Mutex<T>>) -> Self {
        Self { watch_manager }
    }
}

#[async_trait]
impl<T: WatchManagerTrait> TaskBase for ChangeDirTask<T> {
    fn validate(&self, cmd: &Command) -> bool {
        self.is_valid_args(&cmd.args)
            && cmd.arg_as_path("path", &cmd.cwd).is_some()
    }

    fn schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "path": { "type": "string", "minLength": 1 },
            },
            "required": ["path"],
            "additionalProperties": false,
        })
    }

    async fn try_run(
        &self,
        cmd: &Command,
        arg: &Arc<TaskArg>,
        _: mpsc::Sender<TaskControl>,
    ) -> Result<TaskResult> {
        let path = cmd.arg_as_path("path", &cmd.cwd).unwrap();
        let mut manager = self.watch_manager.lock().await;
        let res = match manager.watch(&cmd.frame, &path, arg).await {
            Ok(data) => TaskResult::data(data, None),
            Err(err) => TaskResult::error(err),
        };
        Ok(res)
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        managers::{MockWatchManagerTrait, WatchManager},
        test_helpers::{
            assert_by_schema, create_command, setup_resources, setup_sender,
            setup_task_arg, teardown_resources, DirInfo,
        },
    };

    use anyhow::bail;

    use super::*;

    async fn setup() -> Result<(
        String,
        Arc<TaskArg>,
        ChangeDirTask<WatchManager>,
        mpsc::Sender<TaskControl>,
    )> {
        let path = setup_resources("").await?;
        let sender = setup_sender();
        let task_arg = setup_task_arg(sender);
        let manager = WatchManager::new("%y/%m/%d %H:%M:%S");
        let task = ChangeDirTask::new(manager);
        let (tx, _) = mpsc::channel::<TaskControl>(10);
        Ok((path, task_arg, task, tx))
    }

    #[tokio::test]
    async fn test_validate_by_schema() -> Result<()> {
        let (path, _task_arg, task, _) = setup().await?;
        let fx_path = "./tests/fixtures/change_dir_task.json";
        assert_by_schema(fx_path, "_", &path, &task).await?;
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_success() -> Result<()> {
        let (path, task_arg, task, tx) = setup().await?;
        let args = json!({ "path": "👟" });
        let cmd = create_command(&path, "_", args)?;
        let TaskResult::Data(res) = task.run(&cmd, &task_arg, tx).await else {
            unreachable!();
        };
        let dir_info = serde_json::from_value::<DirInfo>(res.data)?;
        assert_eq!(dir_info.entries[1].name, "test.txt");
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_error() -> Result<()> {
        let (path, task_arg, _, tx) = setup().await?;
        let mut manager = MockWatchManagerTrait::new();
        manager.expect_watch().returning(|_, _, _| bail!(""));
        let task = ChangeDirTask::new(Arc::new(Mutex::new(manager)));
        let args = json!({ "path": "👟" });
        let cmd = create_command(&path, "_", args)?;
        let res = task.run(&cmd, &task_arg, tx).await;
        assert!(matches!(res, TaskResult::Error(_)));
        teardown_resources(&path).await?;
        Ok(())
    }
}
