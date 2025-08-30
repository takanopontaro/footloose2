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

pub struct WatchInfo {
    pub watch: Watch,
    pub subs: Vec<Arc<dyn SenderTrait>>,
    pub handle: Option<JoinHandle<()>>,
    pub tx: mpsc::Sender<WatchControl>,
}

impl WatchInfo {
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

    async fn process(&mut self) {
        match self.watch.check_updates() {
            Ok(true) => {
                let data = self.data();
                for sub in self.subs.iter() {
                    let _ = sub.dir_update(&data).await;
                }
            }
            Err(err) => {
                self.abort().await;
                let p = &self.watch.path;
                let err = WatchError::Dir(err.to_string(), p.to_owned()).into();
                for sub in self.subs.iter() {
                    let _ = sub.watch_error(&err, p).await;
                }
            }
            _ => {}
        }
    }

    pub fn data(&self) -> Value {
        self.watch.data()
    }

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

    pub fn add_subscriber(&mut self, sub: Arc<dyn SenderTrait>) {
        if !self.subs.contains(&sub) {
            self.subs.push(sub);
        }
    }

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
