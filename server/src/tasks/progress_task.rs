use crate::{
    helpers::{quote_paths, relativize_path, relativize_paths},
    misc::Command,
    models::{
        DisposeType, ProgressTaskArg, ProgressTaskConfig, TaskArg, TaskControl,
        TaskResult, TaskStatus,
    },
    traits::TaskBase,
};

use anyhow::{anyhow, bail, Context, Result};
use async_trait::async_trait;
use serde_json::{json, Value};
use std::{
    future::Future,
    pin::Pin,
    process::{Command as StdCommand, Stdio},
    slice,
    sync::Arc,
};
use tokio::{
    io::{AsyncBufReadExt as _, AsyncReadExt as _, BufReader},
    process::{Child, ChildStderr, ChildStdout, Command as TokioCommand},
    sync::{mpsc, Mutex},
    time::{interval, Duration},
};
use uuid::Uuid;

pub struct ProgressTask;

impl ProgressTask {
    pub fn new() -> Self {
        Self
    }

    fn config(&self, cmd: &Command) -> ProgressTaskConfig {
        let c = cmd.arg("config").unwrap().clone();
        serde_json::from_value::<ProgressTaskConfig>(c).unwrap()
    }

    fn exec_count_shcmd(
        &self,
        cmd_str: &str,
        srcs: &[String],
        dest: &Option<String>,
        cwd: &str,
    ) -> Result<usize> {
        let srcs = quote_paths(srcs);
        let mut cmd_str = cmd_str.replace("%s", &srcs);
        if let Some(dest) = dest {
            let dest = quote_paths(slice::from_ref(dest));
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
        let count = String::from_utf8_lossy(&output.stdout).to_string();
        Ok(count.trim().parse()?)
    }

    fn exec_shcmd(
        &self,
        cmd_str: &str,
        srcs: Vec<String>,
        dest: Option<String>,
        cwd: &str,
    ) -> Result<(Child, BufReader<ChildStdout>, BufReader<ChildStderr>)> {
        let srcs = quote_paths(&srcs);
        let mut cmd_str = cmd_str.replace("%s", &srcs);
        if let Some(dest) = dest {
            let dest = quote_paths(&[dest]);
            cmd_str = cmd_str.replace("%d", &dest);
        }
        let mut child = TokioCommand::new("sh")
            .current_dir(cwd)
            .arg("-c")
            .arg(cmd_str)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()?;
        let stdout = child.stdout.take().context("")?;
        let stderr = child.stderr.take().context("")?;
        Ok((child, BufReader::new(stdout), BufReader::new(stderr)))
    }

    fn create_progress(&self, arg: ProgressTaskArg) -> (String, DisposeType) {
        let ProgressTaskArg {
            total,
            mut stdout,
            mut stderr,
            child,
            sender,
            tx,
        } = arg;

        let pid = Uuid::new_v4().to_string();

        let pid_ = pid.clone();
        let child_ = child.clone();
        let sender_ = sender.clone();
        let handle = tokio::spawn(async move {
            let mut intv = interval(Duration::from_secs(1));
            let mut buf = Vec::new();
            let mut count = 0;
            // 1 秒以内に終わるなら progress を発行してほしくないため、
            // 最初の tick() を消化しておく
            intv.tick().await;
            loop {
                tokio::select! {
                    res = stdout.read_until(b'\n', &mut buf) => {
                        buf.clear();
                        count += 1;
                        match res {
                            Ok(0) => break,
                            Ok(_) => continue,
                            Err(err) => {
                                let _ = sender_
                                    .progress_error(&pid_, &err.into())
                                    .await;
                            }
                        }
                    }
                    _ = intv.tick() => {
                        let num = ((count + 1) as f32 / total as f32) * 100.0;
                        let _ = sender_.progress(&pid_, num as usize).await;
                    }
                }
            }
            match child_.lock().await.wait().await {
                Ok(status) => {
                    if status.success() {
                        let _ = sender_.progress_end(&pid_).await;
                    } else {
                        let mut buf = String::new();
                        let _ = stderr.read_to_string(&mut buf).await;
                        let err = anyhow!(buf);
                        let _ = sender_.progress_error(&pid_, &err).await;
                    }
                }
                Err(err) => {
                    let _ = sender_.progress_error(&pid_, &err.into()).await;
                }
            }
            let ctrl = TaskControl {
                pid: pid_,
                status: TaskStatus::End,
            };
            let _ = tx.send(ctrl).await;
        });

        let pid_ = pid.clone();
        let dispose = move || {
            Box::pin(async move {
                handle.abort();
                let _ = child.lock().await.kill().await;
                let _ = sender.progress_abort(&pid_).await;
            }) as Pin<Box<dyn Future<Output = ()> + Send>>
        };

        (pid, Box::new(dispose))
    }
}

#[async_trait]
impl TaskBase for ProgressTask {
    fn validate(&self, cmd: &Command) -> bool {
        if !self.is_valid_args(&cmd.args) {
            return false;
        }
        if cmd.arg_as_path_array("sources", &cmd.cwd).is_none() {
            return false;
        }
        true
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
                        "total": { "type": "string", "minLength": 1 },
                    },
                    "required": ["cmd", "total"],
                    "additionalProperties": false,
                }
            },
            "required": ["sources", "config"],
            "additionalProperties": false,
        })
    }

    async fn try_run(
        &self,
        cmd: &Command,
        arg: &Arc<TaskArg>,
        tx: mpsc::Sender<TaskControl>,
    ) -> Result<TaskResult> {
        let srcs = cmd.arg_as_path_array("sources", &cmd.cwd).unwrap();
        let dest = cmd.arg_as_path("destination", &cmd.cwd);
        let config = self.config(cmd);
        let total = self
            .exec_count_shcmd(&config.total, &srcs, &dest, &cmd.cwd)
            .unwrap_or(usize::MAX);
        let srcs = relativize_paths(&srcs, &cmd.cwd);
        let dest = dest.map(|d| relativize_path(&d, &cmd.cwd));
        let (child, stdout, stderr) =
            self.exec_shcmd(&config.cmd, srcs, dest, &cmd.cwd)?;

        let (pid, dispose) = self.create_progress(ProgressTaskArg {
            total,
            stdout,
            stderr,
            child: Arc::new(Mutex::new(child)),
            sender: arg.sender.clone(),
            tx,
        });

        Ok(TaskResult::progress(pid, dispose))
    }
}

#[cfg(test)]
mod tests {
    use crate::test_helpers::{
        assert_by_schema, count_entries, create_command, setup_resources,
        setup_sender, setup_task_arg, sleep, teardown_resources,
    };

    use std::path::Path;

    use super::*;

    async fn progress_task_setup_success(
        task: ProgressTask,
        args: Value,
    ) -> Result<(String, Box<dyn Fn(&str) -> String>)> {
        let path = setup_resources("").await?;
        let (tx, _) = mpsc::channel::<TaskControl>(10);
        let mut sender = setup_sender();
        sender.expect_progress_end().times(1).returning(|_| Ok(()));
        let task_arg = setup_task_arg(sender);
        let cmd = create_command(&path, "_", args)?;
        let TaskResult::Progress(_) = task.run(&cmd, &task_arg, tx).await
        else {
            unreachable!();
        };
        sleep(100).await;
        let p = path.clone();
        let fmt = move |s: &str| format!("{p}/{s}");
        Ok((path, Box::new(fmt)))
    }

    async fn progress_task_setup_error(
        task: ProgressTask,
        args: Value,
    ) -> Result<()> {
        let path = setup_resources("").await?;
        let (tx, _) = mpsc::channel::<TaskControl>(10);
        let mut sender = setup_sender();
        sender
            .expect_progress_error()
            .times(1)
            .returning(|_, _| Ok(()));
        let task_arg = setup_task_arg(sender);
        let cmd = create_command(&path, "_", args)?;
        let TaskResult::Progress(_) = task.run(&cmd, &task_arg, tx).await
        else {
            unreachable!();
        };
        sleep(100).await;
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_validate_by_schema() -> Result<()> {
        let path = setup_resources("").await?;
        let task = ProgressTask::new();
        let fx_path = "./tests/fixtures/progress_task.json";
        assert_by_schema(fx_path, "_", &path, &task).await?;
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_progress_cp_success() -> Result<()> {
        let args = json!({
            "sources": ["👟/test1", "👟/test.txt"],
            "destination": "👟/test3",
            "config": {
                "cmd": "cp -rv %s %d",
                "src": "multiple",
                "dest": true,
                "total": "find %s | wc -l"
            }
        });
        let task = ProgressTask::new();
        let (path, ..) = progress_task_setup_success(task, args).await?;
        let total = count_entries(&[format!("{path}/test3")])?;
        assert_eq!(total, 4);
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_progress_cp_error() -> Result<()> {
        let args = json!({
            "sources": ["👟/test1", "👟/test.txt"],
            "destination": "👟/nonexistent",
            "config": {
                "cmd": "cp -rv %s %d",
                "src": "multiple",
                "dest": true,
                "total": "find %s | wc -l"
            }
        });
        let task = ProgressTask::new();
        progress_task_setup_error(task, args).await
    }

    #[tokio::test]
    async fn test_run_progress_mv_success() -> Result<()> {
        let args = json!({
            "sources": ["👟/test1", "👟/test.txt"],
            "destination": "👟/test3",
            "config": {
                "cmd": "mv -v %s -t %d",
                "src": "multiple",
                "dest": true,
                "total": "node -e 'console.log(process.argv.length-1)' %s"
            }
        });
        let task = ProgressTask::new();
        let (path, fmt) = progress_task_setup_success(task, args).await?;
        let total = count_entries(&[fmt("test3")])?;
        assert_eq!(total, 4);
        assert!(!Path::new(&fmt("test1")).is_dir());
        assert!(!Path::new(&fmt("test.txt")).is_file());
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_progress_mv_error() -> Result<()> {
        let args = json!({
            "sources": ["👟/test1", "👟/test.txt"],
            "destination": "👟/nonexistent",
            "config": {
                "cmd": "mv -v %s -t %d",
                "src": "multiple",
                "dest": true,
                "total": "node -e 'console.log(process.argv.length-1)' %s"
            }
        });
        let task = ProgressTask::new();
        progress_task_setup_error(task, args).await
    }

    #[tokio::test]
    async fn test_run_progress_zip_success() -> Result<()> {
        let args = json!({
            "sources": ["👟/test1", "👟/test.txt"],
            "destination": "👟/test3/foo.zip",
            "config": {
                "cmd": "zip -r %d %s",
                "src": "multiple",
                "dest": true,
                "total": "find %s | wc -l"
            }
        });
        let task = ProgressTask::new();
        let (path, fmt) = progress_task_setup_success(task, args).await?;
        assert!(Path::new(&fmt("test3/foo.zip")).is_file());
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_progress_zip_error() -> Result<()> {
        let args = json!({
            "sources": ["👟/test1", "👟/test.txt"],
            "destination": "👟/nonexistent/foo.zip",
            "config": {
                "cmd": "zip -r %d %s",
                "src": "multiple",
                "dest": true,
                "total": "find %s | wc -l"
            }
        });
        let task = ProgressTask::new();
        progress_task_setup_error(task, args).await
    }

    #[tokio::test]
    async fn test_run_progress_unzip_success() -> Result<()> {
        let args = json!({
            "sources": ["👟/test1", "👟/test.txt"],
            "destination": "👟/foo.zip",
            "config": {
                "cmd": "zip -r %d %s",
                "src": "multiple",
                "dest": true,
                "total": "find %s | wc -l"
            }
        });
        let task = ProgressTask::new();
        let (path1, fmt) = progress_task_setup_success(task, args).await?;
        let args = json!({
            "sources": [fmt("foo.zip")],
            "destination": "👟/test3",
            "config": {
                "cmd": "unzip %s -d %d",
                "src": "single",
                "dest": true,
                "total": "zipinfo -1 %s | LC_ALL=C grep -v '/$' | wc -l"
            }
        });
        let task = ProgressTask::new();
        let (path2, fmt) = progress_task_setup_success(task, args).await?;
        let total = count_entries(&[fmt("test3")])?;
        assert_eq!(total, 4);
        teardown_resources(&path1).await?;
        teardown_resources(&path2).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_progress_unzip_error() -> Result<()> {
        let args = json!({
            "sources": ["👟/nonexistent.zip"],
            "destination": "👟/test3",
            "config": {
                "cmd": "unzip %s -d %d",
                "src": "single",
                "dest": true,
                "total": "zipinfo -1 %s | LC_ALL=C grep -v '/$' | wc -l"
            }
        });
        let task = ProgressTask::new();
        progress_task_setup_error(task, args).await
    }

    #[tokio::test]
    async fn test_run_progress_tar_success() -> Result<()> {
        let args = json!({
            "sources": ["👟/test1", "👟/test.txt"],
            "destination": "👟/test3/foo.tar",
            "config": {
                "cmd": "tar cvf %d %s",
                "src": "multiple",
                "dest": true,
                "total": "find %s | wc -l"
            }
        });
        let task = ProgressTask::new();
        let (path, fmt) = progress_task_setup_success(task, args).await?;
        assert!(Path::new(&fmt("test3/foo.tar")).is_file());
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_progress_tar_error() -> Result<()> {
        let args = json!({
            "sources": ["👟/test1", "👟/test.txt"],
            "destination": "👟/nonexistent/foo.tar",
            "config": {
                "cmd": "tar cvf %d %s",
                "src": "multiple",
                "dest": true,
                "total": "find %s | wc -l"
            }
        });
        let task = ProgressTask::new();
        progress_task_setup_error(task, args).await
    }

    #[tokio::test]
    async fn test_run_progress_untar_success() -> Result<()> {
        let args = json!({
            "sources": ["👟/test1", "👟/test.txt"],
            "destination": "👟/foo.tar",
            "config": {
                "cmd": "tar cvf %d %s",
                "src": "multiple",
                "dest": true,
                "total": "find %s | wc -l"
            }
        });
        let task = ProgressTask::new();
        let (path1, fmt) = progress_task_setup_success(task, args).await?;
        let args = json!({
            "sources": [fmt("foo.tar")],
            "destination": "👟/test3",
            "config": {
                "cmd": "tar xvf %s -C %d",
                "src": "single",
                "dest": true,
                "total": "tar -tf %s | LC_ALL=C grep -v '/$' | wc -l"
            }
        });
        let task = ProgressTask::new();
        let (path2, fmt) = progress_task_setup_success(task, args).await?;
        let total = count_entries(&[fmt("test3")])?;
        assert_eq!(total, 4);
        teardown_resources(&path1).await?;
        teardown_resources(&path2).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_progress_untar_error() -> Result<()> {
        let args = json!({
            "sources": ["👟/nonexistent.tar"],
            "destination": "👟/test3",
            "config": {
                "cmd": "tar xvf %s -C %d",
                "src": "single",
                "dest": true,
                "total": "tar -tf %s | LC_ALL=C grep -v '/$' | wc -l"
            }
        });
        let task = ProgressTask::new();
        progress_task_setup_error(task, args).await
    }

    #[tokio::test]
    async fn test_run_progress_tgz_success() -> Result<()> {
        let args = json!({
            "sources": ["👟/test1", "👟/test.txt"],
            "destination": "👟/test3/foo.tgz",
            "config": {
                "cmd": "tar cvfz %d %s",
                "src": "multiple",
                "dest": true,
                "total": "find %s | wc -l"
            }
        });
        let task = ProgressTask::new();
        let (path, fmt) = progress_task_setup_success(task, args).await?;
        assert!(Path::new(&fmt("test3/foo.tgz")).is_file());
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_progress_tgz_error() -> Result<()> {
        let args = json!({
            "sources": ["👟/test1", "👟/test.txt"],
            "destination": "👟/nonexistent/foo.tgz",
            "config": {
                "cmd": "tar cvfz %d %s",
                "src": "multiple",
                "dest": true,
                "total": "find %s | wc -l"
            }
        });
        let task = ProgressTask::new();
        progress_task_setup_error(task, args).await
    }

    #[tokio::test]
    async fn test_run_progress_untgz_success() -> Result<()> {
        let args = json!({
            "sources": ["👟/test1", "👟/test.txt"],
            "destination": "👟/foo.tgz",
            "config": {
                "cmd": "tar cvfz %d %s",
                "src": "multiple",
                "dest": true,
                "total": "find %s | wc -l"
            }
        });
        let task = ProgressTask::new();
        let (path1, fmt) = progress_task_setup_success(task, args).await?;
        let args = json!({
            "sources": [fmt("foo.tgz")],
            "destination": "👟/test3",
            "config": {
                "cmd": "tar xvfz %s -C %d",
                "src": "single",
                "dest": true,
                "total": "tar -ztf %s | LC_ALL=C grep -v '/$' | wc -l"
            }
        });
        let task = ProgressTask::new();
        let (path2, fmt) = progress_task_setup_success(task, args).await?;
        let total = count_entries(&[fmt("test3")])?;
        assert_eq!(total, 4);
        teardown_resources(&path1).await?;
        teardown_resources(&path2).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_progress_untgz_error() -> Result<()> {
        let args = json!({
            "sources": ["👟/nonexistent.tgz"],
            "destination": "👟/test3",
            "config": {
                "cmd": "tar xvfz %s -C %d",
                "src": "single",
                "dest": true,
                "total": "tar -ztf %s | LC_ALL=C grep -v '/$' | wc -l"
            }
        });
        let task = ProgressTask::new();
        progress_task_setup_error(task, args).await
    }

    #[tokio::test]
    async fn test_run_progress_rn_success() -> Result<()> {
        let args = json!({
            "sources": ["👟/test.txt"],
            "destination": "👟/foo.txt",
            "config": {
                "cmd": "mv -v %s %d",
                "src": "single",
                "dest": true,
                "total": "node -e 'console.log(process.argv.length-1)' %s"
            }
        });
        let task = ProgressTask::new();
        let (path, fmt) = progress_task_setup_success(task, args).await?;
        assert!(!Path::new(&fmt("test.txt")).is_file());
        assert!(Path::new(&fmt("foo.txt")).is_file());
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_progress_rn_error() -> Result<()> {
        let args = json!({
            "sources": ["👟/nonexistent.txt"],
            "destination": "👟/foo.txt",
            "config": {
                "cmd": "mv -v %s %d",
                "src": "single",
                "dest": true,
                "total": "node -e 'console.log(process.argv.length-1)' %s"
            }
        });
        let task = ProgressTask::new();
        progress_task_setup_error(task, args).await
    }

    #[tokio::test]
    async fn test_run_progress_rm_success() -> Result<()> {
        let args = json!({
            "sources": ["👟/test1", "👟/test.txt"],
            "config": {
                "cmd": "rm -vr %s",
                "src": "multiple",
                "dest": false,
                "total": "find %s | wc -l"
            }
        });
        let task = ProgressTask::new();
        let (path, fmt) = progress_task_setup_success(task, args).await?;
        assert!(!Path::new(&fmt("test1")).is_dir());
        assert!(!Path::new(&fmt("test.txt")).is_file());
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_progress_rm_error() -> Result<()> {
        let args = json!({
            "sources": ["👟/test1", "👟/nonexistent.txt"],
            "config": {
                "cmd": "rm -vr %s",
                "src": "multiple",
                "dest": false,
                "total": "find %s | wc -l"
            }
        });
        let task = ProgressTask::new();
        progress_task_setup_error(task, args).await
    }

    #[tokio::test]
    async fn test_run_progress_touch_success() -> Result<()> {
        let args = json!({
            "sources": ["👟/new-test.txt"],
            "config": {
                "cmd": "touch %s",
                "src": "single",
                "dest": false,
                "total": "node -e 'console.log(process.argv.length-1)' %s"
            }
        });
        let task = ProgressTask::new();
        let (path, fmt) = progress_task_setup_success(task, args).await?;
        assert!(Path::new(&fmt("new-test.txt")).is_file());
        teardown_resources(&path).await?;
        Ok(())
    }

    // No error test cases
    // async fn test_run_progress_touch_error() -> Result<()>

    #[tokio::test]
    async fn test_run_progress_mkdir_success() -> Result<()> {
        let args = json!({
            "sources": ["👟/test4"],
            "config": {
                "cmd": "mkdir -v %s",
                "src": "single",
                "dest": false,
                "total": "node -e 'console.log(process.argv.length-1)' %s"
            }
        });
        let task = ProgressTask::new();
        let (path, fmt) = progress_task_setup_success(task, args).await?;
        assert!(Path::new(&fmt("test4")).is_dir());
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_progress_mkdir_error() -> Result<()> {
        let args = json!({
            "sources": ["👟/test3"],
            "config": {
                "cmd": "mkdir -v %s",
                "src": "single",
                "dest": false,
                "total": "node -e 'console.log(process.argv.length-1)' %s"
            }
        });
        let task = ProgressTask::new();
        progress_task_setup_error(task, args).await
    }
}
