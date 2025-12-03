use crate::{
    errors::WatchError,
    misc::{Ls, SenderTrait, Watch},
    models::{WatchControl, WatchStatus},
};

use anyhow::Result;
use serde_json::Value;
use std::{sync::Arc, time::Duration};
use tokio::{
    sync::{mpsc, Mutex},
    task::JoinHandle,
    time::sleep,
};

/// ディレクトリ監視構造体や購読者を扱う構造体。
///
/// # Fields
/// * `watch` - ディレクトリ監視構造体
/// * `subs` - 変更通知を受け取る購読者のリスト
/// * `handle` - バックグラウンド監視タスクのハンドル
/// * `tx` - 監視制御メッセージの送信チャネル
///   WatchManager との通信用。
pub struct WatchInfo {
    pub watch: Watch,
    pub subs: Vec<Arc<dyn SenderTrait>>,
    pub handle: Option<JoinHandle<()>>,
    pub tx: mpsc::Sender<WatchControl>,
}

impl WatchInfo {
    /// 新しい WatchInfo インスタンスを作成し、監視を開始する。
    ///
    /// # Arguments
    /// * `path` - 監視するディレクトリのパス
    /// * `tx` - 監視制御メッセージの送信チャネル
    /// * `ls` - ディレクトリ情報を取得する構造体
    pub async fn new(
        path: &str,
        tx: mpsc::Sender<WatchControl>,
        ls: Arc<Ls>,
    ) -> Result<Arc<Mutex<Self>>> {
        let ins = Arc::new(Mutex::new(Self {
            watch: Watch::new(path, ls)?,
            subs: vec![],
            handle: None,
            tx,
        }));
        {
            let mut raw = ins.lock().await;
            let handle = raw.spawn(&ins).await;
            raw.handle = Some(handle);
        }
        Ok(ins)
    }

    /// ディレクトリの変更をバックグラウンドで監視するタスクを spawn する。
    ///
    /// 変更のチェックは 500 ミリ秒ごとに行われる。
    ///
    /// # Arguments
    /// * `ins` - このインスタンス
    async fn spawn(&self, ins: &Arc<Mutex<Self>>) -> JoinHandle<()> {
        let ins_ = ins.clone();
        tokio::spawn(async move {
            let duration = Duration::from_millis(500);
            loop {
                sleep(duration).await;
                ins_.lock().await.process().await;
            }
        })
    }

    /// ディレクトリの変更をチェックして購読者に通知する。
    async fn process(&mut self) {
        match self.watch.check_updates() {
            // 変更があった場合、最新のディレクトリ情報を取得して全購読者に通知する。
            Ok(true) => {
                let data = self.data();
                for sub in self.subs.iter() {
                    let _ = sub.dir_update(&data).await;
                }
            }
            // エラーが発生した場合、監視を中止して全購読者にエラーを通知する。
            Err(err) => {
                self.abort().await;
                let p = &self.watch.path;
                let err = WatchError::Dir(err.to_string(), p.to_owned()).into();
                for sub in self.subs.iter() {
                    let _ = sub.watch_error(&err, p).await;
                }
            }
            _ => {} // 変更がなかった場合。
        }
    }

    /// ディレクトリ情報を JSON 形式で取得する。
    ///
    /// # Returns
    /// ディレクトリ情報
    pub fn data(&self) -> Value {
        self.watch.data()
    }

    /// 監視を中止する。
    ///
    /// バックグラウンドタスクを中止し、WatchManager に通知する。
    /// その際エラーが発生した場合は続行不可能と判断しプロセスを終了する。
    async fn abort(&self) {
        self.handle.as_ref().unwrap().abort();
        let ctrl = WatchControl {
            path: self.watch.path.clone(),
            status: WatchStatus::Abort,
        };
        if self.tx.send(ctrl).await.is_err() {
            eprintln!("Failed to send message to WatchManager");
            std::process::exit(1);
        }
    }

    /// 購読者を追加する。
    ///
    /// # Arguments
    /// * `sub` - 追加する購読者
    pub fn add_subscriber(&mut self, sub: Arc<dyn SenderTrait>) {
        if !self.subs.contains(&sub) {
            self.subs.push(sub);
        }
    }

    /// 購読者を削除する。
    ///
    /// 削除した結果、購読者がゼロになった場合は監視を中止する。
    ///
    /// # Arguments
    /// * `sub` - 削除する購読者
    pub async fn remove_subscriber(&mut self, sub: &Arc<dyn SenderTrait>) {
        self.subs.retain(|s| s != sub);
        if self.subs.is_empty() {
            self.abort().await;
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::test_helpers::{
        assert_err, setup_resources, setup_sender, sleep, teardown_resources,
        DirInfo,
    };

    use tokio::fs;

    use super::*;

    async fn setup(
    ) -> Result<(String, mpsc::Receiver<WatchControl>, Arc<Mutex<WatchInfo>>)>
    {
        let path = setup_resources("").await?;
        let (tx, rx) = mpsc::channel::<WatchControl>(10);
        let ls = Arc::new(Ls::new("%y/%m/%d %H:%M:%S"));
        let info = WatchInfo::new(&path, tx, ls).await?;
        Ok((path, rx, info))
    }

    #[tokio::test]
    async fn test_watch_info_new() -> Result<()> {
        let (path, _rx, info) = setup().await?;
        assert!(info.lock().await.handle.is_some());
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_process_success() -> Result<()> {
        let mut sender = setup_sender();
        sender.expect_dir_update().times(1).returning(|data| {
            let dir_info = serde_json::from_value::<DirInfo>(data.clone())?;
            assert_eq!(dir_info.entries[1].name, "new.txt");
            Ok(())
        });
        let sender = Arc::new(sender);
        let (path, _rx, info) = setup().await?;
        let mut info = info.lock().await;
        info.add_subscriber(sender.clone());
        fs::write(format!("{path}/new.txt"), "").await?;
        info.process().await;
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_process_error() -> Result<()> {
        let mut sender = setup_sender();
        sender.expect_watch_error().times(1).returning(|err, _| {
            assert_err(err, &WatchError::Dir("".to_owned(), "".to_owned()));
            Ok(())
        });
        let sender = Arc::new(sender);
        let (path, mut rx, info) = setup().await?;
        let mut info = info.lock().await;
        info.add_subscriber(sender.clone());
        teardown_resources(&path).await?;
        info.process().await;
        let WatchControl { path: p, status } = rx.recv().await.unwrap();
        assert_eq!(p, path);
        assert_eq!(status, WatchStatus::Abort);
        sleep(10).await;
        assert!(info.handle.as_ref().unwrap().is_finished());
        Ok(())
    }

    #[tokio::test]
    async fn test_data() -> Result<()> {
        let (path, _rx, info) = setup().await?;
        let data = info.lock().await.data();
        let dir_info = serde_json::from_value::<DirInfo>(data)?;
        assert_eq!(dir_info.entries[1].name, "test.txt");
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_add_subscriber() -> Result<()> {
        let sender = Arc::new(setup_sender());
        let (path, _rx, info) = setup().await?;
        let mut info = info.lock().await;
        info.add_subscriber(sender.clone());
        assert!(info.subs[0] == sender);
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_remove_subscriber() -> Result<()> {
        let sender = Arc::new(setup_sender());
        let (path, _rx, info) = setup().await?;
        let mut info = info.lock().await;
        info.add_subscriber(sender.clone());
        let sender = sender as Arc<dyn SenderTrait>;
        info.remove_subscriber(&sender).await;
        assert!(info.subs.is_empty());
        teardown_resources(&path).await?;
        Ok(())
    }
}
