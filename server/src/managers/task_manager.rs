use crate::{
    errors::{CommandError, SenderError},
    misc::Command,
    models::{DisposeType, TaskArg, TaskControl, TaskResult, TaskStatus},
    traits::{InternalTaskBase, TaskBase},
};

use anyhow::{bail, Result};
use std::{collections::HashMap, sync::Arc};
use tokio::sync::{mpsc, Mutex};

pub struct TaskManager {
    tasks: HashMap<String, Box<dyn TaskBase>>,
    internal_tasks: HashMap<String, Box<dyn InternalTaskBase>>,
    disposers: Arc<Mutex<HashMap<String, DisposeType>>>,
    disposer_map: Arc<Mutex<HashMap<String, Vec<String>>>>,
    tx: mpsc::Sender<TaskControl>,
}

impl TaskManager {
    pub fn new() -> Self {
        let (tx, mut rx) = mpsc::channel::<TaskControl>(10);
        let disposers =
            Arc::new(Mutex::new(HashMap::<String, DisposeType>::new()));
        let disposer_map =
            Arc::new(Mutex::new(HashMap::<String, Vec<String>>::new()));
        let disposers_ = disposers.clone();
        let disposer_map_ = disposer_map.clone();
        tokio::spawn(async move {
            while let Some(TaskControl { pid, status }) = rx.recv().await {
                let dispose = disposers_.lock().await.remove(&pid).unwrap();
                if status == TaskStatus::Abort {
                    dispose().await;
                }
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

    pub fn register(&mut self, name: &str, task: impl TaskBase + 'static) {
        self.tasks.insert(name.to_owned(), Box::new(task));
    }

    pub fn register_internal(
        &mut self,
        name: &str,
        task: impl InternalTaskBase + 'static,
    ) {
        self.internal_tasks.insert(name.to_owned(), Box::new(task));
    }

    pub async fn run(&self, cmd: &Command, arg: &Arc<TaskArg>) -> Result<()> {
        let Err(err) = self.try_run(cmd, arg).await else {
            return Ok(());
        };
        if let Some(SenderError::Send) = err.downcast_ref::<SenderError>() {
            bail!("");
        }
        arg.sender.error(&cmd.id, &err).await?;
        Ok(())
    }

    async fn try_run(&self, cmd: &Command, arg: &Arc<TaskArg>) -> Result<()> {
        let task = self.find_task(cmd)?;
        match task.run(cmd, arg, self.tx.clone()).await {
            TaskResult::Success(_) => {
                arg.sender.success(&cmd.id).await?;
                Ok(())
            }
            TaskResult::Data(res) => {
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

    fn find_task(&self, cmd: &Command) -> Result<&dyn TaskBase> {
        let Some(task) = self.tasks.get(&cmd.name) else {
            bail!(CommandError::NotFound);
        };
        if !task.validate(cmd) {
            bail!(CommandError::Args);
        }
        Ok(task.as_ref())
    }

    pub async fn run_internal(&self, name: &str, arg: &Arc<TaskArg>) {
        let task = self.internal_tasks.get(name).unwrap();
        if let Err(err) = task.run(arg).await {
            eprintln!("Failed to run internal task: {name}\n{err}");
            std::process::exit(1);
        }
    }

    pub async fn drop_all_disposers(&self, sender_id: &str) {
        let Some(pids) = self.disposer_map.lock().await.remove(sender_id)
        else {
            return;
        };
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
        assert!(
            !manager.disposer_map.lock().await.contains_key(sender_id)
        );
        Ok(())
    }
}
