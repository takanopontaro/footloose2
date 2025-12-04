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

/// 進行状況を報告しながら実行するタスク。
pub struct ProgressTask;

impl ProgressTask {
    /// 新しい ProgressTask インスタンスを生成する。
    pub fn new() -> Self {
        Self
    }

    /// コマンドからタスク設定を取得する。
    ///
    /// # Arguments
    /// * `cmd` - 対象コマンド
    fn config(&self, cmd: &Command) -> ProgressTaskConfig {
        let c = cmd.arg("config").unwrap().clone();
        serde_json::from_value::<ProgressTaskConfig>(c).unwrap()
    }

    /// 処理対象エントリの総数を算出するシェルコマンドを実行する。
    ///
    /// # Arguments
    /// * `cmd_str` - 実行するコマンド文字列
    /// * `srcs` - ソースパスの配列
    /// * `dest` - 展開先ディレクトリ
    /// * `cwd` - 基準となるディレクトリ
    ///
    /// # Returns
    /// 成功： 処理対象の総数
    /// 失敗： stderr
    fn exec_count_shcmd(
        &self,
        cmd_str: &str,
        srcs: &[String],
        dest: &Option<String>,
        cwd: &str,
    ) -> Result<usize> {
        // コマンド文字列内の `%s` をソースパスに置換する。
        // パスは `"` でクォートされ、複数の場合はスペースで連結される。
        // 例： `foo %s` -> `foo "path/to/src1" "path/to/src2"`
        let srcs = quote_paths(srcs);
        let mut cmd_str = cmd_str.replace("%s", &srcs);

        // コマンド文字列内の `%d` を展開先のディレクトリパスに置換する。
        // パスは `"` でクォートされる。
        // 例： `foo %d` -> `foo "path/to/dest"`
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

    /// シェルコマンドを非同期で実行する。
    ///
    /// `cwd` をカレントディレクトリとして実行される。
    ///
    /// # Arguments
    /// * `cmd_str` - 実行するコマンド文字列
    /// * `srcs` - ソースパスの配列
    ///   呼び出し元で `cwd` を基準とした相対パスに変換済み。
    /// * `dest` - 展開先ディレクトリ
    ///   呼び出し元で `cwd` を基準とした相対パスに変換済み。
    /// * `cwd` - 基準となるディレクトリ
    ///
    /// # Returns
    /// 成功： stdout (改行区切り)
    /// 失敗： stderr
    fn exec_shcmd(
        &self,
        cmd_str: &str,
        srcs: Vec<String>,
        dest: Option<String>,
        cwd: &str,
    ) -> Result<(Child, BufReader<ChildStdout>, BufReader<ChildStderr>)> {
        // コマンド文字列内の `%s` をソースパスに置換する。
        // パスは `"` でクォートされ、複数の場合はスペースで連結される。
        // 例： `foo %s` -> `foo "path/to/src1" "path/to/src2"`
        let srcs = quote_paths(&srcs);
        let mut cmd_str = cmd_str.replace("%s", &srcs);

        // コマンド文字列内の `%d` を展開先のディレクトリパスに置換する。
        // パスは `"` でクォートされる。
        // 例： `foo %d` -> `foo "path/to/dest"`
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

    /// ProgressTask のハンドラを作成する。
    ///
    /// # Arguments
    /// * `arg` - ProgressTask の設定
    ///
    /// # Returns
    /// プロセス ID と中断処理関数のタプル
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

        // メイン処理の非同期タスク
        let handle = tokio::spawn(async move {
            let mut intv = interval(Duration::from_secs(1));
            let mut buf = Vec::new();
            let mut count = 0; // 処理済みエントリ数

            // 1 秒以内に終わるなら progress を発行してほしくないため、
            // 最初の tick() を消化しておく。
            intv.tick().await;

            // stdout を読んで count を加算しつつ、定期的に進捗率を送信する。
            // 確実に進捗率を送信するため `biased;` を指定する。
            // これにより、ready なブロックが複数あった場合、
            // 先に書かれている方が処理されるようになる (デフォルトはランダム)。
            loop {
                tokio::select! {
                    biased;
                    _ = intv.tick() => {
                        let num = ((count + 1) as f32 / total as f32) * 100.0;
                        let _ = sender_.progress(&pid_, num as usize).await;
                    }
                    res = stdout.read_until(b'\n', &mut buf) => {
                        buf.clear(); // 使わないのでクリアする。
                        count += 1;
                        match res {
                            Ok(0) => break, // EOF
                            Ok(_) => continue,
                            Err(err) => {
                                let _ = sender_
                                    .progress_error(&pid_, &err.into())
                                    .await;
                                // プログラムによっては延々エラーを吐き続けることも
                                // あり得るのでリミットを設ける。
                                // - total 回以上処理する必要はない。
                                // - total 算出に失敗している場合 (usize::MAX) は
                                //   エラーが起きたらあきらめてさっさと抜ける。
                                if count >= total || total == usize::MAX {
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            // コマンド (子プロセス) の終了を待って結果を送信する。
            match child_.lock().await.wait().await {
                Ok(status) => {
                    if status.success() {
                        let _ = sender_.progress_end(&pid_).await;
                    } else {
                        // エラー時は stderr を読み取って送信する。
                        // exit code が 0 でありながらエラーということもあり得るが、
                        // それは無視する。
                        let mut buf = String::new();
                        let _ = stderr.read_to_string(&mut buf).await;
                        let err = anyhow!(buf);
                        let _ = sender_.progress_error(&pid_, &err).await;
                    }
                }
                Err(err) => {
                    // 厳密には進捗エラーとは異なるが、同じ扱いとする。
                    let _ = sender_.progress_error(&pid_, &err.into()).await;
                }
            }

            // 終了メッセージを TaskManager に送信する。
            let ctrl = TaskControl {
                pid: pid_,
                status: TaskStatus::End,
            };
            let _ = tx.send(ctrl).await;
        });

        // 中断処理関数を生成する。
        // メイン処理を中止、子プロセスを強制終了し、中断メッセージを送信する。
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
        // 総数を算出する。エラー時は便宜上 usize::MAX とする。
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
