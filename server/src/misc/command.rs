use crate::{
    errors::CommandError,
    helpers::{absolutize_path, normalize_path},
};

use anyhow::{bail, Result};
use serde::Deserialize;
use serde_json::{json, Value};
use std::{collections::HashMap, path::Path};

pub type CmdArgsType = HashMap<String, Value>;

#[derive(Debug, Deserialize)]
pub struct Command {
    pub id: String,
    pub frame: String,
    pub cwd: String,
    pub name: String,
    pub args: CmdArgsType,
}

impl Command {
    pub fn new(str: &str) -> Result<Self> {
        Self::parse(str).map_err(|_| CommandError::Parse.into())
    }

    fn parse(str: &str) -> Result<Self> {
        let schema = Self::schema();
        let instance = serde_json::from_str(str)?;
        if !jsonschema::is_valid(&schema, &instance) {
            bail!("");
        }
        Ok(serde_json::from_str::<Self>(str)?)
    }

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

    pub fn arg(&self, key: &str) -> Option<&Value> {
        self.args.get(key)
    }

    pub fn arg_as_str(&self, key: &str) -> Option<&str> {
        self.arg(key).and_then(|v| v.as_str())
    }

    pub fn arg_as_str_array(&self, key: &str) -> Option<Vec<&str>> {
        self.arg(key).and_then(|v| {
            let mut res = vec![];
            for item in v.as_array()? {
                res.push(item.as_str()?);
            }
            Some(res)
        })
    }

    fn as_path_str(&self, path: &str) -> Option<String> {
        if Path::new(path).is_relative() {
            return None;
        };
        Some(normalize_path(path))
    }

    // 末尾のスラッシュは削除される
    pub fn arg_as_path(&self, key: &str, cwd: &str) -> Option<String> {
        let path = self.arg_as_str(key)?;
        let path = absolutize_path(path, cwd);
        self.as_path_str(&path)
    }

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
