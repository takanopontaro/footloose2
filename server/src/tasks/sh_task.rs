use crate::{
    helpers::{quote_paths, relativize_path, relativize_paths},
    misc::Command,
    models::{ShTaskConfig, TaskArg, TaskControl, TaskResult},
    traits::TaskBase,
};

use anyhow::{bail, Result};
use async_trait::async_trait;
use serde_json::{json, Value};
use std::{process::Command as StdCommand, sync::Arc};
use tokio::sync::mpsc;

pub struct ShTask;

impl ShTask {
    pub fn new() -> Self {
        Self
    }

    fn config(&self, cmd: &Command) -> ShTaskConfig {
        let c = cmd.arg("config").unwrap().clone();
        serde_json::from_value::<ShTaskConfig>(c).unwrap()
    }

    fn exec_shcmd(
        &self,
        cmd_str: &str,
        srcs: Option<Vec<String>>,
        dest: Option<String>,
        cwd: &str,
    ) -> Result<String> {
        let mut cmd_str = cmd_str.to_owned();
        if let Some(srcs) = srcs {
            let srcs = quote_paths(&srcs);
            cmd_str = cmd_str.replace("%s", &srcs);
        }
        if let Some(dest) = dest {
            let dest = quote_paths(&[dest]);
            cmd_str = cmd_str.replace("%d", &dest);
        }
        let output = StdCommand::new("sh")
            .current_dir(cwd)
            .arg("-c")
            .arg(cmd_str)
            .output()?;
        if !output.status.success() {
            bail!(String::from_utf8_lossy(&output.stderr).to_string());
        }
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        Ok(stdout.lines().collect::<Vec<_>>().join("\n"))
    }
}

#[async_trait]
impl TaskBase for ShTask {
    fn validate(&self, cmd: &Command) -> bool {
        self.is_valid_args(&cmd.args)
    }

    fn schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "sources": {
                    "type": "array",
                    "items": { "type": "string", "minLength": 1 },
                    "minItems": 1,
                },
                "destination": { "type": "string", "minLength": 1 },
                "config": {
                    "type": "object",
                    "properties": {
                        "cmd": { "type": "string", "minLength": 1 },
                    },
                    "required": ["cmd"],
                    "additionalProperties": false,
                }
            },
            "required": ["config"],
            "additionalProperties": false,
        })
    }

    async fn try_run(
        &self,
        cmd: &Command,
        _: &Arc<TaskArg>,
        _: mpsc::Sender<TaskControl>,
    ) -> Result<TaskResult> {
        let srcs = cmd.arg_as_path_array("sources", &cmd.cwd);
        let dest = cmd.arg_as_path("destination", &cmd.cwd);
        let config = self.config(cmd);

        let srcs = srcs.map(|s| relativize_paths(&s, &cmd.cwd));
        let dest = dest.map(|d| relativize_path(&d, &cmd.cwd));
        let res = match self.exec_shcmd(&config.cmd, srcs, dest, &cmd.cwd) {
            Ok(stdout) => TaskResult::data(Value::String(stdout), None),
            Err(stderr) => TaskResult::error(stderr),
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

    use std::path::Path;

    use super::*;

    async fn setup(
    ) -> Result<(String, Arc<TaskArg>, ShTask, mpsc::Sender<TaskControl>)> {
        let path = setup_resources("").await?;
        let sender = setup_sender();
        let task_arg = setup_task_arg(sender);
        let task = ShTask::new();
        let (tx, _) = mpsc::channel::<TaskControl>(10);
        Ok((path, task_arg, task, tx))
    }

    #[tokio::test]
    async fn test_validate_by_schema() -> Result<()> {
        let (path, _task_arg, task, _) = setup().await?;
        let fx_path = "./tests/fixtures/sh_task.json";
        assert_by_schema(fx_path, "_", &path, &task).await?;
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_sh_error() -> Result<()> {
        let (path, task_arg, task, tx) = setup().await?;
        let args = json!({
            "config": {
                "cmd": "nonexistent-cmd",
                "src": "none",
                "dest": false
            }
        });
        let cmd = create_command(&path, "_", args)?;
        let res = task.run(&cmd, &task_arg, tx).await;
        assert!(matches!(res, TaskResult::Error(_)));
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_sh_mktemp_success() -> Result<()> {
        let (path, task_arg, task, tx) = setup().await?;
        let args = json!({
            "config": {
                "cmd": "mktemp -d",
                "src": "none",
                "dest": false
            }
        });
        let cmd = create_command(&path, "_", args)?;
        let TaskResult::Data(res) = task.run(&cmd, &task_arg, tx).await else {
            unreachable!();
        };
        // String が格納されている serde_json::Value を to_string() すると、
        // 引用符で囲まれた文字列が返る。
        // 純粋な文字列だけが欲しい場合は .as_str() を使う。
        let temp_path = res.data.as_str().unwrap();
        assert!(Path::new(temp_path).is_dir());
        teardown_resources(&path).await?;
        Ok(())
    }
}
