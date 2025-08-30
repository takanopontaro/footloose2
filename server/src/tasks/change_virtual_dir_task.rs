use crate::{
    archives::{Tar, Tgz, Zip},
    errors::VirtualDirError,
    helpers::{ls_style_size, parent_entry},
    managers::WatchManager,
    misc::Command,
    models::{ArchiveKind, Entry, TaskArg, TaskControl, TaskResult},
    traits::{Archive, TaskBase},
};

use anyhow::Result;
use async_trait::async_trait;
use regex::Regex;
use serde_json::{json, Value};
use std::{path::Path, sync::Arc};
use tokio::sync::{mpsc, Mutex};

pub struct ChangeVirtualDirTask {
    watch_manager: Arc<Mutex<WatchManager>>,
    time_style: String,
}

impl ChangeVirtualDirTask {
    pub fn new(
        watch_manager: Arc<Mutex<WatchManager>>,
        time_style: &str,
    ) -> Self {
        Self {
            watch_manager,
            time_style: time_style.to_owned(),
        }
    }

    fn parent_path(&self, path: &str) -> String {
        let mut p = Path::new(path)
            .parent()
            .and_then(|p| p.to_str())
            .unwrap_or("")
            .to_owned();
        if p.is_empty() {
            p += "/";
        }
        p
    }

    fn validate_path(
        &self,
        path: &str,
        cwd: &str,
        filter: &Option<Regex>,
    ) -> bool {
        if !path.starts_with(cwd) {
            return false;
        }
        if filter.is_none() {
            return true;
        }
        let re = filter.as_ref().unwrap();
        let path = path.strip_prefix(cwd).unwrap();
        !re.is_match(path)
    }

    fn dir_entry(&self, name: &str) -> Entry {
        Entry {
            perm: "d---------".to_owned(),
            name: name.to_owned(),
            size: ls_style_size(0),
            time: "--/--/-- --:--:--".to_owned(),
            link: String::new(),
        }
    }

    fn get_entries(
        &self,
        kind: &ArchiveKind,
        archive: &str,
        cwd: &str,
        filter: &Option<Regex>,
    ) -> Result<Vec<Entry>> {
        let mut parent_ent = parent_entry(archive, &self.time_style)?;
        let mut cwd = cwd.to_owned();
        if !cwd.is_empty() {
            // /foo/bar -> foo/bar/
            cwd = cwd[1..].to_string() + "/";
        }
        let parent_p = self.parent_path(&cwd);
        let mut archive: Box<dyn Archive> = match kind {
            ArchiveKind::Zip => Box::new(Zip::new(archive, &self.time_style)?),
            ArchiveKind::Tar => Box::new(Tar::new(archive, &self.time_style)?),
            ArchiveKind::Tgz => Box::new(Tgz::new(archive, &self.time_style)?),
        };
        let mut entries: Vec<Entry> = vec![];
        let re_entry = Regex::new(r"^[^/]+/?$").unwrap();
        let re_dir = Regex::new(r"^([^/]+)/").unwrap();
        for entry in archive.entries()? {
            let entry = entry?;
            let path = entry.path();
            if !self.validate_path(&path, &cwd, filter) {
                continue;
            }
            if path == parent_p {
                parent_ent = entry.entry("..");
                continue;
            }
            let mut name = path.strip_prefix(&cwd).unwrap_or(&path);
            if re_entry.is_match(name) {
                name = name.strip_suffix("/").unwrap_or(name);
                let ent = entry.entry(name);
                entries.push(ent);
                continue;
            }
            let Some(caps) = re_dir.captures(name) else {
                continue;
            };
            let dir = &caps[1];
            let exists = entries.iter().any(|e| e.name == dir);
            if exists {
                continue;
            }
            let ent = self.dir_entry(dir);
            entries.push(ent);
        }
        entries.sort_by(|a, b| a.name.cmp(&b.name));
        entries.insert(0, parent_ent);
        Ok(entries)
    }
}

#[async_trait]
impl TaskBase for ChangeVirtualDirTask {
    fn validate(&self, cmd: &Command) -> bool {
        self.is_valid_args(&cmd.args)
            && cmd.arg_as_path("archive", &cmd.cwd).is_some()
            && cmd.arg_as_path("path", &cmd.cwd).is_some()
    }

    fn schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "kind": {
                    "type": "string",
                    "enum": ["zip", "tar", "tgz"],
                },
                "archive": { "type": "string", "minLength": 1 },
                "path": { "type": "string", "minLength": 1 },
                "filter": { "type": "string", "minLength": 1 },
            },
            "required": ["kind", "archive", "path"],
            "additionalProperties": false,
        })
    }

    async fn try_run(
        &self,
        cmd: &Command,
        arg: &Arc<TaskArg>,
        _: mpsc::Sender<TaskControl>,
    ) -> Result<TaskResult> {
        let kind = cmd.arg_as_str("kind").unwrap();
        let kind = ArchiveKind::from_str(kind)?;
        let archive = cmd.arg_as_path("archive", &cmd.cwd).unwrap();
        let path = cmd.arg_as_path("path", &cmd.cwd).unwrap();
        let filter = cmd.arg_as_str("filter").and_then(|s| Regex::new(s).ok());
        // /xx/yy/zz.zip/aa/bb -> /aa/bb
        let Some(cwd) = path.strip_prefix(&archive) else {
            let err = VirtualDirError::OutsideRoot;
            return Ok(TaskResult::error(err.into()));
        };
        let res = match self.get_entries(&kind, &archive, cwd, &filter) {
            Ok(data) => {
                let manager = self.watch_manager.lock().await;
                manager.unwatch(&cmd.frame, "", arg).await;
                let data = json!({ "path": path, "entries": data });
                TaskResult::data(data, None)
            }
            Err(err) => TaskResult::error(err),
        };
        Ok(res)
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        managers::WatchManager,
        test_helpers::{
            assert_by_schema, assert_err, create_command, setup_sender,
            setup_task_arg, teardown_resources, DirInfo,
        },
    };

    use std::fs::copy;
    use tempfile::tempdir;
    use unicode_normalization::UnicodeNormalization as _;

    use super::*;

    fn nfc(s: &str) -> String {
        s.nfc().to_string()
    }

    async fn setup(
        archive: &str,
    ) -> Result<(
        String,
        Arc<TaskArg>,
        ChangeVirtualDirTask,
        mpsc::Sender<TaskControl>,
    )> {
        let root = tempdir()?.keep().to_string_lossy().to_string();
        if !archive.is_empty() {
            let name = Path::new(archive).file_name().unwrap();
            let to = Path::new(&root).join(name);
            copy(archive, &to)?;
        }
        let sender = setup_sender();
        let task_arg = setup_task_arg(sender);
        let manager = WatchManager::new("%y/%m/%d %H:%M:%S");
        let task = ChangeVirtualDirTask::new(manager, "%y/%m/%d %H:%M:%S");
        let (tx, _) = mpsc::channel::<TaskControl>(10);
        Ok((root, task_arg, task, tx))
    }

    #[tokio::test]
    async fn test_validate_by_schema() -> Result<()> {
        let (path, _task_arg, task, _) = setup("").await?;
        let fx_path = "./tests/fixtures/change_virtual_dir_task.json";
        assert_by_schema(fx_path, "_", &path, &task).await?;
        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_filter() -> Result<()> {
        let name = "dir-entries.tar";
        let a = format!("./tests/archives/{name}");
        let (path, task_arg, task, tx) = setup(&a).await?;

        let args = json!({
            "kind": "tar",
            "archive": format!("{path}/{name}"),
            "path": name
        });
        let cmd = create_command(&path, "_", args)?;
        let TaskResult::Data(res) = task.run(&cmd, &task_arg, tx.clone()).await
        else {
            unreachable!();
        };
        let dir_info = serde_json::from_value::<DirInfo>(res.data)?;
        assert_eq!(dir_info.entries[1].name, "._2 image.jpg");

        let args = json!({
            "kind": "tar",
            "archive": format!("{path}/{name}"),
            "path": name,
            "filter": "^(__MACOSX/|\\._.+)"
        });
        let cmd = create_command(&path, "_", args)?;
        let TaskResult::Data(res) = task.run(&cmd, &task_arg, tx.clone()).await
        else {
            unreachable!();
        };
        let dir_info = serde_json::from_value::<DirInfo>(res.data)?;
        assert_eq!(dir_info.entries[1].name, ".hidden_file");

        teardown_resources(&path).await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_run_success() -> Result<()> {
        let list = vec![
            ("zip", "dir-entries"),
            ("zip", "no-dir-entries"),
            ("tar", "dir-entries"),
            ("tar", "no-dir-entries"),
            ("tgz", "dir-entries"),
            ("tgz", "no-dir-entries"),
        ];
        for (kind, archive) in list {
            let name = format!("{archive}.{kind}");
            let a = format!("./tests/archives/{name}");
            let (path, task_arg, task, tx) = setup(&a).await?;
            let archive = format!("{path}/{name}");

            let args = json!({
                "kind": kind,
                "archive": &archive,
                "path": name,
                "filter": "^(__MACOSX/|\\._.+)"
            });
            let cmd = create_command(&path, "_", args)?;
            let TaskResult::Data(res) =
                task.run(&cmd, &task_arg, tx.clone()).await
            else {
                unreachable!();
            };
            let dir_info = serde_json::from_value::<DirInfo>(res.data)?;
            assert!(dir_info.entries.len() == 7);
            assert_eq!(dir_info.entries[0].name, "..");
            assert_eq!(dir_info.entries[1].name, ".hidden_file");
            assert_eq!(dir_info.entries[2].name, "1 text.txt");
            assert_eq!(dir_info.entries[3].name, nfc("1 ゲーム"));
            if archive == "no-dir-entries" {
                assert_eq!(dir_info.entries[3].perm, "d---------");
            }
            assert_eq!(dir_info.entries[4].name, "2 image.jpg");
            assert_eq!(dir_info.entries[5].name, "2 movies");
            assert_eq!(dir_info.entries[6].name, "3 blank");

            let mut cwd = format!("{path}/{name}/1 ゲーム");
            cwd = nfc(&cwd);
            let args = json!({
                "kind": kind,
                "archive": &archive,
                "path": nfc("1 オープンワールド"),
                "filter": "^(__MACOSX/|\\._.+)"
            });
            let cmd = create_command(&cwd, "_", args)?;
            let TaskResult::Data(res) =
                task.run(&cmd, &task_arg, tx.clone()).await
            else {
                unreachable!();
            };
            let dir_info = serde_json::from_value::<DirInfo>(res.data)?;
            assert!(dir_info.entries.len() == 4);
            assert_eq!(dir_info.entries[0].name, "..");
            assert_eq!(dir_info.entries[1].name, "1 テキスト.txt");
            assert_eq!(dir_info.entries[2].name, nfc("1 空ディレクトリ"));
            assert_eq!(dir_info.entries[3].name, "2 画像.jpg");

            teardown_resources(&path).await?;
        }
        Ok(())
    }

    #[tokio::test]
    async fn test_run_error() -> Result<()> {
        let name = "dir-entries.zip";
        let a = format!("./tests/archives/{name}");
        let (path, task_arg, task, tx) = setup(&a).await?;
        let archive = format!("{path}/{name}");
        let args = json!({
            "kind": "zip",
            "archive": &archive,
            "path": "..",
            "filter": "^(__MACOSX/|\\._.+)"
        });
        let cmd = create_command(&archive, "_", args)?;
        let TaskResult::Error(res) = task.run(&cmd, &task_arg, tx).await else {
            unreachable!();
        };
        assert_err(&res.err, &VirtualDirError::OutsideRoot);
        teardown_resources(&path).await?;
        Ok(())
    }
}
