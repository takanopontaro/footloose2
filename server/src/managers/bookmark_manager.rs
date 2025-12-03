use crate::{errors::BookmarkError, models::Bookmark};

use anyhow::{bail, Error, Result};
use serde_json::Value;
use std::sync::Arc;
use tokio::fs;

/// ブックマークを管理する構造体。
///
/// # Fields
/// * `path` - ブックマーク JSON ファイルのパス
///   None の場合、ブックマーク機能は無効。
pub struct BookmarkManager {
    path: Option<String>,
}

impl BookmarkManager {
    /// エラーを BookmarkError 型に変換する。
    ///
    /// # Arguments
    /// * `err` - 変換元のエラー
    ///
    /// # Returns
    /// 変換後のエラー
    pub fn to_error(err: Error) -> Error {
        match err.downcast_ref::<BookmarkError>() {
            Some(BookmarkError::NotAvailable) => err,
            Some(BookmarkError::Exists) => err,
            Some(BookmarkError::NotFound) => err,
            _ => BookmarkError::IO(err.to_string()).into(),
        }
    }

    /// 新しい BookmarkManager を作成する。
    ///
    /// シングルトンとして使用される。
    ///
    /// # Arguments
    /// * `path` - ブックマーク JSON ファイルのパス
    ///
    /// # Returns
    /// BookmarkManager の Arc
    pub fn new(path: &Option<String>) -> Arc<Self> {
        Arc::new(Self { path: path.clone() })
    }

    /// ブックマークの操作を実行する。
    ///
    /// - `get`: ブックマーク一覧を取得
    /// - `add`: 新規ブックマークを追加
    /// - `rename`: ブックマーク名を変更
    /// - `delete`: ブックマークを削除
    ///
    /// # Arguments
    /// * `action` - 実行する操作
    ///   `get`, `add`, `rename`, `delete` のいずれか。
    ///   `&str` 型だが、JSON Schema により検証済みの値が渡される。
    /// * `name` - ブックマーク名
    /// * `path` - ブックマークのパス
    ///
    /// # Returns
    /// 操作後のブックマーク一覧
    pub async fn process(
        &self,
        action: &str,
        name: &str,
        path: &str,
    ) -> Result<Value> {
        let mut data = self.load().await?;
        self.validate(&data, action, name, path)?;
        match action {
            "add" => data.insert(
                0,
                Bookmark {
                    name: name.to_owned(),
                    path: path.to_owned(),
                },
            ),
            "rename" => {
                let bmk = data.iter_mut().find(|b| b.path == path).unwrap();
                bmk.name = name.to_owned();
            }
            "delete" => data.retain(|b| b.path != path),
            _ => {} // 事実上 `get`
        }
        self.save(&data).await?;
        Ok(serde_json::to_value(data)?)
    }

    /// ブックマーク操作の妥当性を検証する。
    ///
    /// # Arguments
    /// * `data` - 最新のブックマーク一覧
    /// * `action` - 実行する操作
    /// * `name` - ブックマーク名
    /// * `path` - ブックマークのパス
    ///
    /// # Returns
    /// 検証結果 (bool ではなく Result)
    ///
    /// # Errors
    /// - `BookmarkError::Exists`:
    ///   リネームしようとした名前がすでに存在する。
    ///   追加しようとしたブックマークがすでに存在する。
    /// - `BookmarkError::NotFound`:
    ///   操作対象のブックマークが見つからない。
    fn validate(
        &self,
        data: &[Bookmark],
        action: &str,
        name: &str,
        path: &str,
    ) -> Result<()> {
        if action == "get" {
            return Ok(());
        }
        if action == "rename" && data.iter().any(|b| b.name == name) {
            bail!(BookmarkError::Exists);
        }
        let exists = data.iter().any(|b| b.path == path);
        if action == "add" && exists {
            bail!(BookmarkError::Exists);
        }
        if action != "add" && !exists {
            bail!(BookmarkError::NotFound);
        }
        Ok(())
    }

    /// ブックマークファイルを読み込む。
    ///
    /// # Returns
    /// ブックマーク一覧
    async fn load(&self) -> Result<Vec<Bookmark>> {
        let data = fs::read_to_string(self.path()?).await?;
        Ok(serde_json::from_str(&data)?)
    }

    /// ブックマークをファイルに保存する。
    ///
    /// # Arguments
    /// * `data` - 保存するブックマーク一覧
    async fn save(&self, data: &Vec<Bookmark>) -> Result<()> {
        let json = serde_json::to_string_pretty(data)?;
        fs::write(self.path()?, json).await?;
        Ok(())
    }

    /// ブックマークファイルのパスを返す。
    ///
    /// # Returns
    /// ファイルパス
    ///
    /// # Errors
    /// - `BookmarkError::NotAvailable`:
    ///   パスが未設定である。
    fn path(&self) -> Result<&str> {
        self.path
            .as_deref()
            .ok_or_else(|| BookmarkError::NotAvailable.into())
    }
}

#[cfg(test)]
mod tests {
    use crate::test_helpers::{
        assert_err, setup_resources, teardown_resources,
    };

    use serde_json::json;

    use super::*;

    async fn setup(content: &str) -> Result<(String, Arc<BookmarkManager>)> {
        let path = setup_resources(content).await?;
        let bmk_path = format!("{path}/test.txt");
        let manager = BookmarkManager::new(&Some(bmk_path));
        Ok((path, manager))
    }

    async fn load(manager: &Arc<BookmarkManager>) -> Result<Vec<Bookmark>> {
        let data = manager.process("get", "", "").await?;
        Ok(serde_json::from_value(data)?)
    }

    fn dummy() -> String {
        json!([
            {"name": "test1", "path": "/test1"},
            {"name": "test2", "path": "/test2"}
        ])
        .to_string()
    }

    #[tokio::test]
    async fn test_get_bookmark() -> Result<()> {
        let (path, manager) = setup(&dummy()).await?;
        let bookmarks = load(&manager).await?;
        assert_eq!(bookmarks.len(), 2);
        assert_eq!(bookmarks[0].name, "test1");
        assert_eq!(bookmarks[1].name, "test2");
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_add_bookmark() -> Result<()> {
        let (path, manager) = setup("[]").await?;
        manager.process("add", "test1", "/test1").await?;
        let bookmarks = load(&manager).await?;
        assert_eq!(bookmarks.len(), 1);
        assert_eq!(bookmarks[0].name, "test1");
        assert_eq!(bookmarks[0].path, "/test1");
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_rename_bookmark() -> Result<()> {
        let (path, manager) = setup(&dummy()).await?;
        manager.process("rename", "new_test1", "/test1").await?;
        let bookmarks = load(&manager).await?;
        assert_eq!(bookmarks.len(), 2);
        assert_eq!(bookmarks[0].name, "new_test1");
        assert_eq!(bookmarks[0].path, "/test1");
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_delete_bookmark() -> Result<()> {
        let (path, manager) = setup(&dummy()).await?;
        manager.process("delete", "", "/test1").await?;
        let bookmarks = load(&manager).await?;
        assert_eq!(bookmarks.len(), 1);
        assert_eq!(bookmarks[0].name, "test2");
        assert_eq!(bookmarks[0].path, "/test2");
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_add_existing_bookmark() -> Result<()> {
        let (path, manager) = setup(&dummy()).await?;
        let res = manager.process("add", "test1", "/test1").await;
        assert_err(&res.unwrap_err(), &BookmarkError::Exists);
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_rename_bookmark_to_existing_name() -> Result<()> {
        let (path, manager) = setup(&dummy()).await?;
        let res = manager.process("rename", "test2", "/test1").await;
        assert_err(&res.unwrap_err(), &BookmarkError::Exists);
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_rename_nonexistent_bookmark() -> Result<()> {
        let (path, manager) = setup("[]").await?;
        let res = manager.process("rename", "new_test1", "/test1").await;
        assert_err(&res.unwrap_err(), &BookmarkError::NotFound);
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_delete_nonexistent_bookmark() -> Result<()> {
        let (path, manager) = setup("[]").await?;
        let res = manager.process("delete", "", "/test1").await;
        assert_err(&res.unwrap_err(), &BookmarkError::NotFound);
        teardown_resources(&path).await?;
        Ok(())
    }
}
