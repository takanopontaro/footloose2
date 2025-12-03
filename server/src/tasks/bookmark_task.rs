use crate::{
    managers::BookmarkManager,
    misc::Command,
    models::{TaskArg, TaskControl, TaskResult},
    traits::TaskBase,
};

use anyhow::Result;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::sync::Arc;
use tokio::sync::mpsc;

/// ブックマークを管理するタスク。
///
/// # Fields
/// * `bookmark_manager` - BookmarkManager インスタンス
pub struct BookmarkTask {
    bookmark_manager: Arc<BookmarkManager>,
}

impl BookmarkTask {
    /// 新しい BookmarkTask インスタンスを生成する。
    ///
    /// # Arguments
    /// * `bookmark_manager` - BookmarkManager インスタンス
    pub fn new(bookmark_manager: Arc<BookmarkManager>) -> Self {
        Self { bookmark_manager }
    }
}

#[async_trait]
impl TaskBase for BookmarkTask {
    fn validate(&self, cmd: &Command) -> bool {
        if !self.is_valid_args(&cmd.args) {
            return false;
        }
        match cmd.arg_as_str("action") {
            Some("get") => true,
            _ => cmd.arg_as_path("path", &cmd.cwd).is_some(),
        }
    }

    fn schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": ["get", "add", "rename", "delete"],
                },
            },
            "required": ["action"],
            "oneOf": [
                {
                    "properties": {
                        "action": { "const": "get" },
                    },
                    "required": ["action"],
                    "additionalProperties": false,
                },
                {
                    "properties": {
                        "action": { "enum": ["add", "rename"] },
                        "name": { "type": "string", "minLength": 1 },
                        "path": { "type": "string", "minLength": 1 },
                    },
                    "required": ["action", "name", "path"],
                    "additionalProperties": false,
                },
                {
                    "properties": {
                        "action": { "const": "delete" },
                        "path": { "type": "string", "minLength": 1 },
                    },
                    "required": ["action", "path"],
                    "additionalProperties": false,
                },
            ],
        })
    }

    async fn try_run(
        &self,
        cmd: &Command,
        _: &Arc<TaskArg>,
        _: mpsc::Sender<TaskControl>,
    ) -> Result<TaskResult> {
        let action = cmd.arg_as_str("action").unwrap();
        let name = cmd.arg_as_str("name").unwrap_or("");
        let path = cmd
            .arg_as_path("path", &cmd.cwd)
            .unwrap_or_else(|| "".to_owned());
        let res = match self.bookmark_manager.process(action, name, &path).await
        {
            Ok(data) => TaskResult::data(data, None),
            Err(err) => TaskResult::error(BookmarkManager::to_error(err)),
        };
        Ok(res)
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        errors::BookmarkError,
        models::Bookmark,
        test_helpers::{
            assert_by_schema, assert_err, create_command, setup_resources,
            setup_sender, setup_task_arg, teardown_resources,
        },
    };

    use super::*;

    async fn setup(
        content: &str,
    ) -> Result<(
        String,
        Arc<TaskArg>,
        BookmarkTask,
        mpsc::Sender<TaskControl>,
    )> {
        let path = setup_resources(content).await?;
        let sender = setup_sender();
        let task_arg = setup_task_arg(sender);
        let bmk_path = format!("{path}/test.txt");
        let manager = BookmarkManager::new(&Some(bmk_path));
        let task = BookmarkTask::new(manager);
        let (tx, _) = mpsc::channel::<TaskControl>(10);
        Ok((path, task_arg, task, tx))
    }

    #[tokio::test]
    async fn test_validate_by_schema() -> Result<()> {
        let (path, _task_arg, task, _) = setup("[]").await?;
        let fx_path = "./tests/fixtures/bookmark_task.json";
        assert_by_schema(fx_path, "_", &path, &task).await?;
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_get_action() -> Result<()> {
        let content = json!([{ "name": "test1", "path": "/test1" }]);
        let (path, task_arg, task, tx) = setup(&content.to_string()).await?;
        let args = json!({ "action": "get" });
        let cmd = create_command("", "_", args)?;
        let TaskResult::Data(res) = task.run(&cmd, &task_arg, tx).await else {
            unreachable!();
        };
        let bmks = serde_json::from_value::<Vec<Bookmark>>(res.data)?;
        assert_eq!(bmks[0].name, "test1");
        assert_eq!(bmks[0].path, "/test1");
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_get_action_error() -> Result<()> {
        let (path, task_arg, task, tx) = setup("[").await?;
        let args = json!({ "action": "get" });
        let cmd = create_command("", "_", args)?;
        let res = task.run(&cmd, &task_arg, tx).await;
        assert!(matches!(res, TaskResult::Error(_)));
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_add_action() -> Result<()> {
        let (path, task_arg, task, tx) = setup("[]").await?;
        let args =
            json!({ "action": "add", "name": "test1", "path": "/test1" });
        let cmd = create_command("", "_", args)?;
        let TaskResult::Data(res) = task.run(&cmd, &task_arg, tx).await else {
            unreachable!();
        };
        let bmks = serde_json::from_value::<Vec<Bookmark>>(res.data)?;
        assert_eq!(bmks[0].name, "test1");
        assert_eq!(bmks[0].path, "/test1");
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_add_action_error() -> Result<()> {
        let (path, task_arg, task, tx) = setup("[]").await?;
        let args =
            json!({ "action": "add", "name": "test1", "path": "/test1" });
        let cmd = create_command("", "_", args)?;
        let _ = task.run(&cmd, &task_arg, tx.clone()).await;
        let args =
            json!({ "action": "add", "name": "test2", "path": "/test1" });
        let cmd = create_command("", "_", args)?;
        let TaskResult::Error(res) = task.run(&cmd, &task_arg, tx).await else {
            unreachable!();
        };
        assert_err(&res.err, &BookmarkError::Exists);
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_rename_action() -> Result<()> {
        let content = json!([{ "name": "test1", "path": "/test1" }]);
        let (path, task_arg, task, tx) = setup(&content.to_string()).await?;
        let args =
            json!({ "action": "rename", "name": "test2", "path": "/test1" });
        let cmd = create_command("", "_", args)?;
        let TaskResult::Data(res) = task.run(&cmd, &task_arg, tx).await else {
            unreachable!();
        };
        let bmks = serde_json::from_value::<Vec<Bookmark>>(res.data)?;
        assert_eq!(bmks[0].name, "test2");
        assert_eq!(bmks[0].path, "/test1");
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_rename_action_error() -> Result<()> {
        let content = json!([
            { "name": "test1", "path": "/test1" },
            { "name": "test2", "path": "/test2" }
        ]);
        let (path, task_arg, task, tx) = setup(&content.to_string()).await?;
        let args =
            json!({ "action": "rename", "name": "test1", "path": "/test2" });
        let cmd = create_command("", "_", args)?;
        let TaskResult::Error(res) = task.run(&cmd, &task_arg, tx).await else {
            unreachable!();
        };
        assert_err(&res.err, &BookmarkError::Exists);
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_delete_action() -> Result<()> {
        let content = json!([{ "name": "test1", "path": "/test1" }]);
        let (path, task_arg, task, tx) = setup(&content.to_string()).await?;
        let args = json!({ "action": "delete", "path": "/test1" });
        let cmd = create_command("", "_", args)?;
        let TaskResult::Data(res) = task.run(&cmd, &task_arg, tx).await else {
            unreachable!();
        };
        let bmks = serde_json::from_value::<Vec<Bookmark>>(res.data)?;
        assert!(bmks.is_empty());
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_delete_action_error() -> Result<()> {
        let (path, task_arg, task, tx) = setup("[]").await?;
        let args = json!({ "action": "delete", "path": "/test1" });
        let cmd = create_command("", "_", args)?;
        let TaskResult::Error(res) = task.run(&cmd, &task_arg, tx).await else {
            unreachable!();
        };
        assert_err(&res.err, &BookmarkError::NotFound);
        teardown_resources(&path).await?;
        Ok(())
    }
}
