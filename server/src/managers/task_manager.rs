use crate::{
    errors::{CommandError, SenderError},
    misc::Command,
    models::{DisposeType, TaskArg, TaskControl, TaskResult, TaskStatus},
    traits::{InternalTaskBase, TaskBase},
};

use anyhow::{bail, Result};
use std::{collections::HashMap, sync::Arc};
use tokio::sync::{mpsc, Mutex};

/// タスクの登録と実行を管理する構造体。
///
/// # Fields
/// * `tasks` - 通常タスクのマップ
///   key: コマンド名、value: タスク
/// * `internal_tasks` - 内部タスクのマップ
///   key: コマンド名、value: タスク
/// * `disposers` - ProgressTask の中断処理関数のマップ
///   key: ProgressTask のプロセス ID、value: 中断処理関数
/// * `disposer_map` - ProgressTask のプロセス ID リストのマップ
///   key: 送信者 ID、value: プロセス ID のリスト
///   クライアントごとに発行される送信者 ID をキーにして、
///   そのクライアントに紐づくすべての ProgressTask のプロセス ID を保持する。
///   クライアントが切断した時に一気にタスクを中止するために使用する。
/// * `tx` - タスク制御メッセージの送信チャネル
pub struct TaskManager {
    tasks: HashMap<String, Box<dyn TaskBase>>,
    internal_tasks: HashMap<String, Box<dyn InternalTaskBase>>,
    disposers: Arc<Mutex<HashMap<String, DisposeType>>>,
    disposer_map: Arc<Mutex<HashMap<String, Vec<String>>>>,
    tx: mpsc::Sender<TaskControl>,
}

impl TaskManager {
    /// 新しい TaskManager を作成する。
    ///
    /// シングルトンとして使用される。
    pub fn new() -> Self {
        let (tx, mut rx) = mpsc::channel::<TaskControl>(10);
        let disposers =
            Arc::new(Mutex::new(HashMap::<String, DisposeType>::new()));
        let disposer_map =
            Arc::new(Mutex::new(HashMap::<String, Vec<String>>::new()));
        let disposers_ = disposers.clone();
        let disposer_map_ = disposer_map.clone();

        // 非同期タスクで、タスク制御用メッセージを待ち受ける。
        tokio::spawn(async move {
            while let Some(TaskControl { pid, status }) = rx.recv().await {
                // 中断処理関数を取得しつつ、マップから削除する。
                let dispose = disposers_.lock().await.remove(&pid).unwrap();
                // 中止の場合は中断処理関数を実行する。
                // それ以外の場合はすでにタスクは終わってるはずなため何もしない。
                if status == TaskStatus::Abort {
                    dispose().await;
                }
                // disposer_map からも該当する pid を削除する。
                for (_, pids) in disposer_map_.lock().await.iter_mut() {
                    if pids.contains(&pid) {
                        pids.retain(|v| v != &pid);
                    }
                }
            }
        });

        Self {
            tasks: HashMap::new(),
            internal_tasks: HashMap::new(),
            disposers,
            disposer_map,
            tx,
        }
    }

    /// タスクを登録する。
    ///
    /// # Arguments
    /// * `name` - コマンド名
    ///   クライアントとはこの名前を使ってやり取りする。
    /// * `task` - 登録するタスク
    pub fn register(&mut self, name: &str, task: impl TaskBase + 'static) {
        self.tasks.insert(name.to_owned(), Box::new(task));
    }

    /// 内部タスクを登録する。
    ///
    /// # Arguments
    /// * `name` - コマンド名
    ///   クライアントとはこの名前を使ってやり取りする。
    /// * `task` - 登録する内部タスク
    pub fn register_internal(
        &mut self,
        name: &str,
        task: impl InternalTaskBase + 'static,
    ) {
        self.internal_tasks.insert(name.to_owned(), Box::new(task));
    }

    /// コマンドを実行する (エラーハンドリングあり)。
    ///
    /// # Arguments
    /// * `cmd` - 実行するコマンド
    /// * `arg` - タスク引数
    pub async fn run(&self, cmd: &Command, arg: &Arc<TaskArg>) -> Result<()> {
        let Err(err) = self.try_run(cmd, arg).await else {
            return Ok(());
        };
        // 送信エラーの場合はクライアントに何も送れないため何もしない。
        if let Some(SenderError::Send) = err.downcast_ref::<SenderError>() {
            bail!("");
        }
        // クライアントにエラーレスポンスを返す。
        arg.sender.error(&cmd.id, &err).await?;
        Ok(())
    }

    /// コマンドを実行する (エラーハンドリングなし)。
    ///
    /// 実行結果に応じてクライアントに適切なメッセージを送信する。
    ///
    /// # Arguments
    /// * `cmd` - 実行するコマンド
    /// * `arg` - タスク引数
    async fn try_run(&self, cmd: &Command, arg: &Arc<TaskArg>) -> Result<()> {
        let task = self.find_task(cmd)?;
        match task.run(cmd, arg, self.tx.clone()).await {
            TaskResult::Success(_) => {
                arg.sender.success(&cmd.id).await?;
                Ok(())
            }
            TaskResult::Data(res) => {
                // ステータスが未設定の場合は `SUCCESS` とする。
                let status = res.status.unwrap_or("SUCCESS".to_owned());
                arg.sender.data(&cmd.id, &status, &res.data).await?;
                Ok(())
            }
            TaskResult::Progress(res) => {
                arg.sender.progress_task(&cmd.id, &res.pid).await?;
                self.disposers
                    .lock()
                    .await
                    .insert(res.pid.clone(), res.dispose);
                self.disposer_map
                    .lock()
                    .await
                    .entry(arg.sender.id().to_owned())
                    .or_insert_with(Vec::new)
                    .push(res.pid);
                Ok(())
            }
            TaskResult::Error(res) => Err(res.err),
        }
    }

    /// コマンドに対応するタスクを返す。
    ///
    /// # Arguments
    /// * `cmd` - 対象コマンド
    ///
    /// # Returns
    /// 見つかったタスク
    ///
    /// # Errors
    /// - `CommandError::NotFound`:
    ///   タスクが見つからない。
    /// - `CommandError::Args`:
    ///   コマンド引数が不正である。
    fn find_task(&self, cmd: &Command) -> Result<&dyn TaskBase> {
        let Some(task) = self.tasks.get(&cmd.name) else {
            bail!(CommandError::NotFound);
        };
        if !task.validate(cmd) {
            bail!(CommandError::Args);
        }
        Ok(task.as_ref())
    }

    /// 内部タスクを実行する。
    ///
    /// エラーが発生した場合は続行不可能と判断しプロセスを終了する。
    ///
    /// # Arguments
    /// * `name` - コマンド名
    /// * `arg` - タスク引数
    pub async fn run_internal(&self, name: &str, arg: &Arc<TaskArg>) {
        let task = self.internal_tasks.get(name).unwrap();
        if let Err(err) = task.run(arg).await {
            eprintln!("Failed to run internal task: {name}\n{err}");
            std::process::exit(1);
        }
    }

    /// そのクライアントの ProgressTask をすべて中止する。
    ///
    /// クライアントが切断された際にゴミが残らないようにするため。
    ///
    /// # Arguments
    /// * `sender_id` - 送信者 ID
    pub async fn drop_all_disposers(&self, sender_id: &str) {
        let Some(pids) = self.disposer_map.lock().await.remove(sender_id)
        else {
            return;
        };
        // 自身にタスク制御用メッセージ (中止) を送る。
        for pid in pids {
            let ctrl = TaskControl {
                pid,
                status: TaskStatus::Abort,
            };
            let _ = self.tx.send(ctrl).await;
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        models::TaskResult,
        test_helpers::{
            assert_err, create_command, setup_sender, setup_task_arg, sleep,
        },
        traits::{MockInternalTaskBase, MockTaskBase},
    };

    use super::*;

    fn setup_cmd() -> Result<Command> {
        let args = serde_json::from_str("{}").unwrap();
        create_command("", "test", args)
    }

    #[tokio::test]
    async fn test_register_and_run_task() -> Result<()> {
        let mut sender = setup_sender();
        sender.expect_success().times(1).returning(|_| Ok(()));
        let task_arg = setup_task_arg(sender);
        let cmd = setup_cmd()?;
        let mut mock = MockTaskBase::new();
        mock.expect_validate().times(1).return_const(true);
        mock.expect_run()
            .times(1)
            .returning(|_, _, _| TaskResult::success());
        let mut manager = TaskManager::new();
        manager.register("test", mock);
        manager.run(&cmd, &task_arg).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_task_not_found() -> Result<()> {
        let mut sender = setup_sender();
        sender.expect_error().times(1).returning(|_, err| {
            assert_err(err, &CommandError::NotFound);
            Ok(())
        });
        let task_arg = setup_task_arg(sender);
        let cmd = setup_cmd()?;
        let mut mock = MockTaskBase::new();
        mock.expect_validate().times(0);
        mock.expect_run().times(0);
        let mut manager = TaskManager::new();
        manager.register("foo", mock);
        manager.run(&cmd, &task_arg).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_task_invalid_args() -> Result<()> {
        let mut sender = setup_sender();
        sender.expect_error().times(1).returning(|_, err| {
            assert_err(err, &CommandError::Args);
            Ok(())
        });
        let task_arg = setup_task_arg(sender);
        let cmd = setup_cmd()?;
        let mut mock = MockTaskBase::new();
        mock.expect_validate().times(1).return_const(false);
        mock.expect_run().times(0);
        let mut manager = TaskManager::new();
        manager.register("test", mock);
        manager.run(&cmd, &task_arg).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_register_and_run_internal_task() -> Result<()> {
        let sender = setup_sender();
        let task_arg = setup_task_arg(sender);
        let mut mock = MockInternalTaskBase::new();
        mock.expect_run().times(1).returning(|_| Ok(()));
        let mut manager = TaskManager::new();
        manager.register_internal("test", mock);
        manager.run_internal("test", &task_arg).await;
        Ok(())
    }

    #[tokio::test]
    async fn test_drop_all_disposers() -> Result<()> {
        let pid = "foo";
        let sender_id = "bar";
        let manager = TaskManager::new();
        manager
            .disposers
            .lock()
            .await
            .insert(pid.to_owned(), Box::new(|| Box::pin(async move {})));
        manager
            .disposer_map
            .lock()
            .await
            .insert(sender_id.to_owned(), vec![pid.to_owned()]);
        manager.drop_all_disposers(sender_id).await;
        sleep(10).await;
        assert!(!manager.disposers.lock().await.contains_key(pid));
        assert!(!manager.disposer_map.lock().await.contains_key(sender_id));
        Ok(())
    }
}
