use crate::{
    managers::WatchManagerTrait, models::TaskArg, traits::InternalTaskBase,
};

use anyhow::Result;
use async_trait::async_trait;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct RemoveClientTask<T: WatchManagerTrait> {
    watch_manager: Arc<Mutex<T>>,
}

impl<T: WatchManagerTrait> RemoveClientTask<T> {
    pub fn new(watch_manager: Arc<Mutex<T>>) -> Self {
        Self { watch_manager }
    }
}

#[async_trait]
impl<T: WatchManagerTrait> InternalTaskBase for RemoveClientTask<T> {
    async fn run(&self, arg: &Arc<TaskArg>) -> Result<()> {
        self.watch_manager.lock().await.remove_subscriber(arg).await;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        managers::MockWatchManagerTrait,
        test_helpers::{
            setup_resources, setup_sender, setup_task_arg, teardown_resources,
        },
    };

    use super::*;

    async fn setup() -> Result<(String, Arc<TaskArg>)> {
        let path = setup_resources("").await?;
        let sender = setup_sender();
        let task_arg = setup_task_arg(sender);
        Ok((path, task_arg))
    }

    #[tokio::test]
    async fn test_remove_client_task_run() -> Result<()> {
        let (path, task_arg) = setup().await?;
        let task_arg_ = task_arg.clone();
        let mut manager = MockWatchManagerTrait::new();
        manager
            .expect_remove_subscriber()
            .withf(move |arg| arg == &task_arg_)
            .times(1)
            .returning(|_| ());
        let task = RemoveClientTask::new(Arc::new(Mutex::new(manager)));
        let res = task.run(&task_arg).await;
        assert!(res.is_ok());
        teardown_resources(&path).await?;
        Ok(())
    }
}
