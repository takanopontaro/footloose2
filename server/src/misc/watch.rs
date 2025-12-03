use crate::{misc::Ls, models::Entry};

use anyhow::Result;
use serde_json::{json, Value};
use std::sync::Arc;

/// ディレクトリの監視情報を扱う構造体。
///
/// # Fields
/// * `ls` - ディレクトリ情報を取得する構造体
/// * `signature` - ディレクトリの変更検出用の署名
/// * `path` - 監視中のディレクトリパス
/// * `entries` - ディレクトリ内のエントリ一覧
pub struct Watch {
    ls: Arc<Ls>,
    signature: String,
    pub path: String,
    pub entries: Vec<Entry>,
}

impl Watch {
    /// 新しい Watch インスタンスを作成する。
    ///
    /// # Arguments
    /// * `path` - 監視するディレクトリのパス
    /// * `ls` - ディレクトリ情報を取得する構造体
    pub fn new(path: &str, ls: Arc<Ls>) -> Result<Self> {
        Ok(Self {
            signature: ls.signature(path)?,
            path: path.to_owned(),
            entries: ls.entries(path)?,
            ls,
        })
    }

    /// ディレクトリの変更をチェックする。
    ///
    /// # Returns
    /// 変更あり：true、なし：false
    pub fn check_updates(&mut self) -> Result<bool> {
        let sig = self.ls.signature(&self.path)?;
        if self.signature != sig {
            self.signature = sig;
            self.entries = self.ls.entries(&self.path)?;
            return Ok(true);
        }
        Ok(false)
    }

    /// ディレクトリ情報を JSON 形式で取得する。
    ///
    /// # Returns
    /// ディレクトリ情報
    pub fn data(&self) -> Value {
        json!({ "path": self.path, "entries": self.entries })
    }
}

#[cfg(test)]
mod tests {
    use crate::test_helpers::{setup_resources, teardown_resources, DirInfo};

    use tokio::fs;

    use super::*;

    async fn setup() -> Result<(String, Watch)> {
        let path = setup_resources("").await?;
        let ls = Arc::new(Ls::new("%y/%m/%d %H:%M:%S"));
        let watch = Watch::new(&path, ls).unwrap();
        Ok((path, watch))
    }

    #[tokio::test]
    async fn test_watch_new() -> Result<()> {
        let (path, watch) = setup().await?;
        assert_eq!(watch.path, path);
        assert_eq!(watch.entries.len(), 6);
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_watch_check_updates_no_change() -> Result<()> {
        let (path, mut watch) = setup().await?;
        let updated = watch.check_updates()?;
        assert!(!updated);
        assert_eq!(watch.path, path);
        assert_eq!(watch.entries.len(), 6);
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_watch_check_updates_with_change() -> Result<()> {
        let (path, mut watch) = setup().await?;
        let sig = watch.signature.clone();
        fs::write(format!("{path}/new.txt"), "").await?;
        let updated = watch.check_updates()?;
        assert!(updated);
        assert_eq!(watch.path, path);
        assert_eq!(watch.entries.len(), 7);
        assert_eq!(watch.entries[1].name, "new.txt");
        assert_ne!(watch.signature, sig);
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_watch_data() -> Result<()> {
        let (path, watch) = setup().await?;
        let data = watch.data();
        let dir_info = serde_json::from_value::<DirInfo>(data)?;
        assert_eq!(watch.path, path);
        assert_eq!(watch.entries.len(), 6);
        assert_eq!(dir_info.entries[1].name, "test.txt");
        teardown_resources(&path).await?;
        Ok(())
    }
}
