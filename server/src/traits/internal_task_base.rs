use crate::models::TaskArg;

use anyhow::Result;
use async_trait::async_trait;
#[cfg(test)]
use mockall::automock;
use std::sync::Arc;

#[cfg_attr(test, automock)]
#[async_trait]
pub trait InternalTaskBase: Send + Sync {
    async fn run(&self, arg: &Arc<TaskArg>) -> Result<()>;
}
