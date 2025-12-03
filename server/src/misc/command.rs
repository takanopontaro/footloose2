use crate::{
    errors::CommandError,
    helpers::{absolutize_path, normalize_path},
};

use anyhow::{bail, Result};
use serde::Deserialize;
use serde_json::{json, Value};
use std::{collections::HashMap, path::Path};

/// コマンド引数の型エイリアス。
pub type CmdArgsType = HashMap<String, Value>;

/// クライアントから受信したコマンドを表す構造体。
///
/// # Fields
/// * `id` - コマンドID
/// * `frame` - フレームキー (`a` または `b`)
/// * `cwd` - フレームが表示しているディレクトリ
/// * `name` - コマンド名
/// * `args` - コマンド引数
#[derive(Debug, Deserialize)]
pub struct Command {
    pub id: String,
    pub frame: String,
    pub cwd: String,
    pub name: String,
    pub args: CmdArgsType,
}

impl Command {
    /// JSON 文字列から Command インスタンスを作成する。
    ///
    /// # Arguments
    /// * `str` - JSON 形式のコマンド文字列
    ///
    /// # Errors
    /// - `CommandError::Parse`:
    ///   コマンドが不正な形式である。
    pub fn new(str: &str) -> Result<Self> {
        Self::parse(str).map_err(|_| CommandError::Parse.into())
    }

    /// JSON 文字列を検証し、Command インスタンスを返す。
    ///
    /// # Arguments
    /// * `str` - JSON 形式のコマンド文字列
    fn parse(str: &str) -> Result<Self> {
        let schema = Self::schema();
        let instance = serde_json::from_str(str)?;
        if !jsonschema::is_valid(&schema, &instance) {
            bail!("");
        }
        Ok(serde_json::from_str::<Self>(str)?)
    }

    /// コマンドの JSON Schema を定義する。
    ///
    /// # Returns
    /// コマンドの構造を定義する JSON Schema
    fn schema() -> Value {
        json!({
            "type": "object",
            "properties": {
                "id": { "type": "string", "minLength": 1 },
                "frame": { "enum": ["a", "b"] },
                "cwd": { "type": "string", "minLength": 1 },
                "name": { "type": "string", "minLength": 1 },
                "args": { "type": "object" },
            },
            "required": ["id", "frame", "cwd", "name", "args"],
            "additionalProperties": false,
        })
    }

    /// 指定したキーの引数を取得する。
    ///
    /// # Arguments
    /// * `key` - 引数のキー
    pub fn arg(&self, key: &str) -> Option<&Value> {
        self.args.get(key)
    }

    /// 指定したキーの引数を文字列として取得する。
    ///
    /// # Arguments
    /// * `key` - 引数のキー
    pub fn arg_as_str(&self, key: &str) -> Option<&str> {
        self.arg(key).and_then(|v| v.as_str())
    }

    /// 指定したキーの引数を文字列配列として取得する。
    ///
    /// # Arguments
    /// * `key` - 引数のキー
    pub fn arg_as_str_array(&self, key: &str) -> Option<Vec<&str>> {
        self.arg(key).and_then(|v| {
            let mut res = vec![];
            for item in v.as_array()? {
                res.push(item.as_str()?);
            }
            Some(res)
        })
    }

    /// パス文字列を正規化する。
    ///
    /// # Arguments
    /// * `path` - 正規化するパス
    ///
    /// # Returns
    /// 正規化されたパス
    /// `path` が相対パスの場合は None を返す。
    fn as_path_str(&self, path: &str) -> Option<String> {
        if Path::new(path).is_relative() {
            return None;
        };
        Some(normalize_path(path))
    }

    /// 指定したキーの引数をパスとして取得する。
    ///
    /// `cwd` を基準に絶対パスに変換される。
    ///
    /// # Arguments
    /// * `key` - 引数のキー
    /// * `cwd` - 現在のディレクトリ
    pub fn arg_as_path(&self, key: &str, cwd: &str) -> Option<String> {
        let path = self.arg_as_str(key)?;
        let path = absolutize_path(path, cwd);
        self.as_path_str(&path)
    }

    /// 指定したキーの引数をパス配列として取得する。
    ///
    /// `cwd` を基準に絶対パスに変換される。
    ///
    /// # Arguments
    /// * `key` - 引数のキー
    /// * `cwd` - 現在のディレクトリ
    pub fn arg_as_path_array(
        &self,
        key: &str,
        cwd: &str,
    ) -> Option<Vec<String>> {
        let array = self.arg_as_str_array(key)?;
        let mut res = vec![];
        for path in array {
            let path = absolutize_path(path, cwd);
            res.push(self.as_path_str(&path)?);
        }
        Some(res)
    }
}

#[cfg(test)]
mod tests {
    use crate::test_helpers::{create_command, Fixture};

    use tokio::fs;

    use super::*;

    fn setup_cmd(map: &HashMap<String, Value>) -> Result<Command> {
        let cmd_str = serde_json::to_string(&map)?;
        Command::new(&cmd_str)
    }

    #[tokio::test]
    async fn test_validate_by_schema() -> Result<()> {
        let fx_path = "./tests/fixtures/command.json";
        let data = fs::read_to_string(fx_path).await?;
        let fixture = serde_json::from_str::<Fixture>(&data)?;
        for map in fixture.valid {
            let res = setup_cmd(&map);
            assert!(res.is_ok());
        }
        for map in fixture.invalid {
            let res = setup_cmd(&map);
            assert!(res.is_err());
        }
        Ok(())
    }

    #[test]
    fn test_command_new_valid() -> Result<()> {
        let args = json!({ "k1": "v1", "k2": "v2" });
        let cmd = create_command("", "test", args)?;
        assert_eq!(cmd.id, "1");
        assert_eq!(cmd.frame, "a");
        assert_eq!(cmd.cwd, "/foo/bar");
        assert_eq!(cmd.name, "test");
        assert_eq!(cmd.arg("k1").unwrap(), &json!("v1"));
        assert_eq!(cmd.arg("k2").unwrap(), &json!("v2"));
        Ok(())
    }

    #[test]
    fn test_command_arg_as_str() -> Result<()> {
        let args = json!({ "k1": "v1", "k2": 2 });
        let cmd = create_command("", "test", args)?;
        assert_eq!(cmd.arg_as_str("k1").unwrap(), "v1");
        assert_eq!(cmd.arg_as_str("k2"), None);
        Ok(())
    }

    #[test]
    fn test_command_arg_as_str_array() -> Result<()> {
        let args = json!({ "k1": ["v1", "v2"],"k2": [1, 2] });
        let cmd = create_command("", "test", args)?;
        assert_eq!(cmd.arg_as_str_array("k1").unwrap(), ["v1", "v2"].to_vec());
        assert_eq!(cmd.arg_as_str_array("k2"), None);
        Ok(())
    }

    #[tokio::test]
    async fn test_command_arg_as_path() -> Result<()> {
        let args = json!({ "path": "/test1" });
        let cmd = create_command("", "test", args)?;
        assert_eq!(cmd.arg_as_path("path", "").unwrap(), "/test1");
        Ok(())
    }

    #[tokio::test]
    async fn test_command_arg_as_path_relative() -> Result<()> {
        let args = json!({ "path": "../test1" });
        let cmd = create_command("", "test", args)?;
        assert_eq!(cmd.arg_as_path("path", "/foo/bar").unwrap(), "/foo/test1");
        Ok(())
    }

    #[test]
    fn test_command_arg_as_path_invalid() -> Result<()> {
        let args = json!({ "path": "../test1" });
        let cmd = create_command("", "test", args)?;
        assert!(cmd.arg_as_path("path", "").is_none());
        Ok(())
    }

    #[tokio::test]
    async fn test_command_arg_as_path_array() -> Result<()> {
        let args = json!({ "path": ["/test1", "/test2"] });
        let cmd = create_command("", "test", args)?;
        assert_eq!(
            cmd.arg_as_path_array("path", "").unwrap(),
            ["/test1".to_owned(), "/test2".to_owned()].to_vec()
        );
        Ok(())
    }

    #[tokio::test]
    async fn test_command_arg_as_path_array_relative() -> Result<()> {
        let args = json!({ "path": ["../test1", "test2"] });
        let cmd = create_command("", "test", args)?;
        assert_eq!(
            cmd.arg_as_path_array("path", "/foo/bar").unwrap(),
            ["/foo/test1".to_owned(), "/foo/bar/test2".to_owned()].to_vec()
        );
        Ok(())
    }

    #[test]
    fn test_command_arg_as_path_array_invalid() -> Result<()> {
        let args = json!({ "path": ["../test1", "/test2"] });
        let cmd = create_command("", "test", args)?;
        assert!(cmd.arg_as_path_array("path", "").is_none());
        Ok(())
    }
}
