use crate::{
    errors::WatchError,
    misc::{Ls, SenderTrait, WatchInfo},
    models::{TaskArg, WatchControl, WatchStatus},
};

use anyhow::Result;
use async_trait::async_trait;
#[cfg(test)]
use mockall::automock;
use serde_json::Value;
use std::{collections::HashMap, sync::Arc};
use tokio::sync::{mpsc, Mutex};

/// WatchManager の振る舞いを定義するトレイト。
///
/// # Description
/// ディレクトリ監視機能を提供し、ファイルシステムの変更を
/// 購読者に通知する機能を定義する。
#[cfg_attr(test, automock)]
#[async_trait]
pub trait WatchManagerTrait: Send + Sync {
    /// ディレクトリの監視を開始すると同時に、最新のディレクトリ情報を返す。
    ///
    /// # Arguments
    /// * `frame_key` - フレームのキー
    /// * `new_path` - 監視するパス
    /// * `arg` - タスク引数
    ///
    /// # Returns
    /// 最新のディレクトリ情報
    async fn watch(
        &mut self,
        frame_key: &str,
        new_path: &str,
        arg: &Arc<TaskArg>,
    ) -> Result<Value>;

    /// 現在監視しているすべてのパスから自身を登録解除する。
    ///
    /// クライアントが切断された際にゴミが残らないようにするため。
    ///
    /// # Arguments
    /// * `arg` - タスク引数
    async fn remove_subscriber(&self, arg: &Arc<TaskArg>);
}

#[async_trait]
impl WatchManagerTrait for WatchManager {
    async fn watch(
        &mut self,
        frame_key: &str,
        new_path: &str,
        arg: &Arc<TaskArg>,
    ) -> Result<Value> {
        self.unwatch(frame_key, new_path, arg).await;
        arg.frame_set.lock().await.update_path(frame_key, new_path);
        // 他のクライアントがすでに監視中であれば、自身を購読者として追加する。
        // そうでなければ新たに監視を作成する。
        match self.watches.get_mut(new_path) {
            Some(info) => info.lock().await.add_subscriber(arg.sender.clone()),
            None => self.create_watch(new_path, &arg.sender).await?,
        }
        // 最新のディレクトリ情報を取得する。
        let data = self.watches[new_path].lock().await.data();
        Ok(data)
    }

    async fn remove_subscriber(&self, arg: &Arc<TaskArg>) {
        // 現在監視しているパスをすべて取得する。
        let (path0, path1) = {
            let frame_set = arg.frame_set.lock().await;
            let (a, b) = frame_set.both_paths();
            (a.to_owned(), b.to_owned())
        };
        // それぞれに対して自身を登録解除する。
        for path in [path0, path1] {
            if let Some(info) = self.watches.get(&path) {
                info.lock().await.remove_subscriber(&arg.sender).await;
            }
        }
    }
}

/// ディレクトリ監視を管理する構造体。
///
/// # Fields
/// * `ls` - ディレクトリ情報を取得する Ls オブジェクト
/// * `watches` - WatchInfo のマップ
///   key: ディレクトリのパス、value: WatchInfo
/// * `tx` - 監視制御用メッセージの送信チャネル
pub struct WatchManager {
    ls: Arc<Ls>,
    watches: HashMap<String, Arc<Mutex<WatchInfo>>>,
    tx: mpsc::Sender<WatchControl>,
}

impl WatchManager {
    /// 新しい WatchManager を作成する。
    ///
    /// シングルトンとして使用される。
    ///
    /// # Arguments
    /// * `time_style` - 日時のフォーマット文字列
    pub fn new(time_style: &str) -> Arc<Mutex<Self>> {
        let (tx, mut rx) = mpsc::channel::<WatchControl>(10);
        let ins = Arc::new(Mutex::new(Self {
            ls: Arc::new(Ls::new(time_style)),
            watches: HashMap::new(),
            tx,
        }));
        let ins_ = ins.clone();
        // 非同期タスクで、監視制御用メッセージを待ち受ける。
        tokio::spawn(async move {
            while let Some(WatchControl { path, status }) = rx.recv().await {
                if status == WatchStatus::Abort {
                    ins_.lock().await.watches.remove(&path);
                }
            }
        });
        ins
    }

    /// ディレクトリの監視を解除する。
    ///
    /// # Arguments
    /// * `frame_key` - フレームのキー
    /// * `new_path` - 監視するパス
    /// * `arg` - タスク引数
    pub async fn unwatch(
        &self,
        frame_key: &str,
        new_path: &str,
        arg: &Arc<TaskArg>,
    ) {
        // 新しいパスの監視を開始するにあたって、監視不要になる古いパスを取得する。
        // ない場合 (まだ他のフレームが監視している等) は何もせず return する。
        let path = {
            let set = arg.frame_set.lock().await;
            let Some(path) = set.path_to_be_unused(frame_key, new_path) else {
                return;
            };
            path.to_owned()
        };
        // 古いパスから自身を登録解除する。
        if let Some(info) = self.watches.get(&path) {
            info.lock().await.remove_subscriber(&arg.sender).await;
        }
    }

    /// 新しい監視を作成する。
    ///
    /// # Arguments
    /// * `path` - 監視するディレクトリのパス
    /// * `sender` - 送信者オブジェクト
    ///
    /// # Errors
    /// - `WatchError::Watch`:
    ///   監視の作成に失敗した。
    async fn create_watch(
        &mut self,
        path: &str,
        sender: &Arc<dyn SenderTrait>,
    ) -> Result<()> {
        let tx = self.tx.clone();
        let ls = self.ls.clone();
        // 監視の作成に失敗した場合はエラーを throw する。
        let info = WatchInfo::new(path, tx, ls).await.map_err(|err| {
            WatchError::Watch(err.to_string(), path.to_owned())
        })?;
        info.lock().await.add_subscriber(sender.clone());
        self.watches.insert(path.to_owned(), info);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use crate::test_helpers::{
        setup_resources, setup_sender, setup_task_arg, sleep,
        teardown_resources, DirInfo,
    };

    use super::*;

    async fn setup() -> Result<(String, Arc<Mutex<WatchManager>>, Arc<TaskArg>)>
    {
        let path = setup_resources("").await?;
        let manager = WatchManager::new("%y/%m/%d %H:%M:%S");
        let sender = setup_sender();
        let task_arg = setup_task_arg(sender);
        Ok((path, manager, task_arg))
    }

    #[tokio::test]
    async fn test_watch_manager_watch() -> Result<()> {
        let (path, manager, task_arg) = setup().await?;
        let new_path = format!("{path}/test1");
        let mut manager = manager.lock().await;
        let data = manager.watch("a", &new_path, &task_arg).await?;
        let dir_info = serde_json::from_value::<DirInfo>(data)?;
        assert_eq!(dir_info.path, new_path);
        assert_eq!(dir_info.entries[1].name, "test1.txt");
        assert!(manager.watches.contains_key(&new_path));
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_watch_manager_unwatch() -> Result<()> {
        let (path, manager, task_arg) = setup().await?;
        {
            let mut manager = manager.lock().await;
            let new_path = format!("{path}/test1");
            manager.watch("a", &new_path, &task_arg).await?;
            let new_path = format!("{path}/test2");
            manager.watch("b", &new_path, &task_arg).await?;
            let new_path = format!("{path}/test3");
            manager.watch("a", &new_path, &task_arg).await?;
        }
        sleep(10).await;
        let old_path = format!("{path}/test1");
        let manager = manager.lock().await;
        assert_eq!(manager.watches.len(), 2);
        assert!(!manager.watches.contains_key(&old_path));
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_watch_manager_remove_subscriber() -> Result<()> {
        let (path, manager, task_arg) = setup().await?;
        {
            let mut manager = manager.lock().await;
            let new_path = format!("{path}/test1");
            manager.watch("a", &new_path, &task_arg).await?;
            assert_eq!(manager.watches.len(), 1);
            manager.remove_subscriber(&task_arg).await;
        }
        sleep(10).await;
        assert!(manager.lock().await.watches.is_empty());
        teardown_resources(&path).await?;
        Ok(())
    }
}
