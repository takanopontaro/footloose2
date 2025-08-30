#![cfg(test)]

use crate::{
    helpers::quote_paths,
    misc::{CmdArgsType, Command, FrameSet, MockSenderTrait},
    models::{Entry, TaskArg},
    traits::{ErrorCode, TaskBase},
};

use anyhow::{Error, Result};
use serde::Deserialize;
use serde_json::Value;
use std::{
    fs as StdFs,
    mem::discriminant,
    os::unix::fs::{symlink, PermissionsExt as _},
    process::Command as StdCommand,
    sync::Arc,
    time::Duration,
};
use tempfile::tempdir;
use tokio::fs;

#[derive(Deserialize)]
pub struct Fixture {
    pub valid: Vec<CmdArgsType>,
    pub invalid: Vec<CmdArgsType>,
}

#[derive(Deserialize)]
pub struct DirInfo {
    pub path: String,
    pub entries: Vec<Entry>,
}

pub async fn sleep(millis: u64) {
    tokio::time::sleep(Duration::from_millis(millis)).await;
}

pub fn assert_err<E: ErrorCode + PartialEq + 'static>(
    err: &Error,
    expected: &E,
) {
    let e = err.downcast_ref::<E>();
    assert!(e.is_some());
    assert!(discriminant(e.unwrap()) == discriminant(expected));
}

pub async fn setup_resources(content: &str) -> Result<String> {
    let root = tempdir()?;
    let root = root.keep().to_string_lossy().to_string();
    let dir1 = format!("{root}/test1");
    let dir2 = format!("{root}/test2");
    let dir3 = format!("{root}/test3");
    fs::create_dir_all(&dir1).await?;
    fs::create_dir(&dir2).await?;
    fs::create_dir(&dir3).await?;
    let file1 = format!("{dir1}/test1.txt");
    let file2 = format!("{dir2}/test2.txt");
    let file3 = format!("{root}/test.txt");
    fs::write(&file1, "").await?;
    fs::write(&file2, "").await?;
    fs::write(&file3, content).await?;
    symlink(&file1, format!("{root}/test1.txt's link"))?;
    let perms = StdFs::Permissions::from_mode(0o766);
    StdFs::set_permissions(&dir1, perms)?;
    let perms = StdFs::Permissions::from_mode(0o777);
    StdFs::set_permissions(&dir2, perms)?;
    let perms = StdFs::Permissions::from_mode(0o777);
    StdFs::set_permissions(&dir3, perms)?;
    let perms = StdFs::Permissions::from_mode(0o644);
    StdFs::set_permissions(&file1, perms)?;
    let perms = StdFs::Permissions::from_mode(0o755);
    StdFs::set_permissions(&file2, perms)?;
    let perms = StdFs::Permissions::from_mode(0o777);
    StdFs::set_permissions(&file3, perms)?;
    Ok(root)
}

pub async fn teardown_resources(path: &str) -> Result<()> {
    fs::remove_dir_all(&path).await?;
    Ok(())
}

pub fn setup_sender() -> MockSenderTrait {
    let mut mock = MockSenderTrait::new();
    mock.expect_id().return_const("x".to_owned());
    mock
}

pub fn setup_task_arg(sender: MockSenderTrait) -> Arc<TaskArg> {
    Arc::new(TaskArg::new(FrameSet::new(), Arc::new(sender)))
}

pub fn setup_command_str(
    id: &str,
    frame: &str,
    cwd: &str,
    name: &str,
    args: &str,
) -> String {
    format!(
        r#"{{
          "id": "{id}",
          "frame": "{frame}",
          "cwd": "{cwd}",
          "name": "{name}",
          "args": {args}
        }}"#
    )
}

pub fn create_command(cwd: &str, name: &str, args: Value) -> Result<Command> {
    let args = serde_json::to_string(&args)?;
    let args = args.replace("👟", cwd);
    let cwd = if cwd.is_empty() { "/foo/bar" } else { cwd };
    let cmd_str = setup_command_str("1", "a", cwd, name, &args);
    Command::new(&cmd_str)
}

pub async fn assert_by_schema(
    fixture_path: &str,
    name: &str,
    path: &str,
    task: &impl TaskBase,
) -> Result<()> {
    let data = fs::read_to_string(fixture_path).await?;
    let fixture = serde_json::from_str::<Fixture>(&data)?;
    for args in fixture.valid {
        let args = serde_json::to_value(&args)?;
        let cmd = create_command(path, name, args)?;
        assert!(task.validate(&cmd));
    }
    for args in fixture.invalid {
        let args = serde_json::to_value(&args)?;
        let cmd = create_command(path, name, args)?;
        assert!(!task.validate(&cmd));
    }
    Ok(())
}

pub fn count_entries(srcs: &[String]) -> Result<usize> {
    let srcs = quote_paths(srcs);
    let cmd = format!("find {} | wc -l", srcs);
    let output = StdCommand::new("sh").arg("-c").arg(cmd).output()?;
    let count = String::from_utf8_lossy(&output.stdout).to_string();
    Ok(count.trim().parse()?)
}
