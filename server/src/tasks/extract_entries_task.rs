use crate::{
    errors::VirtualDirError,
    helpers::decode_string,
    misc::Command,
    models::{ArchiveKind, TaskArg, TaskControl, TaskResult},
    traits::TaskBase,
};

use anyhow::{bail, Result};
use async_trait::async_trait;
use flate2::read::GzDecoder;
use serde_json::{json, Value};
use std::{
    fs::{create_dir_all, File},
    io::{copy, BufReader, Read},
    os::unix::ffi::OsStringExt as _,
    path::Path,
    sync::Arc,
};
use tokio::sync::mpsc;

pub struct ExtractEntriesTask;

impl ExtractEntriesTask {
    pub fn new() -> Self {
        Self {}
    }

    fn decode_path(&self, raw: &[u8]) -> String {
        let s = decode_string(raw);
        if s.starts_with("./") {
            return s.strip_prefix("./").unwrap().to_owned();
        }
        s
    }

    fn is_match(&self, raw: &[u8], srcs: &[String]) -> bool {
        let path = format!("/{}", self.decode_path(raw));
        srcs.iter()
            .any(|s| s == &path || path.starts_with(&format!("{s}/")))
    }

    // archive: /Users/takanopontaro/Desktop/archive.zip
    // path: rust/util/ascii/tests/expected/ascii.txt
    // path: rust/util/ascii/tests/expected/foo/
    // cwd: /Users/takanopontaro/Desktop/archive.zip/rust/util/ascii
    // -> tests/expected/ascii.txt
    // archive: /Users/takanopontaro/Desktop/archive.zip
    // path: rust
    // cwd: /Users/takanopontaro/Desktop/archive.zip
    // -> rust
    fn relative_path(
        &self,
        archive: &str,
        path: &str,
        cwd: &str,
    ) -> Option<String> {
        let root = cwd
            .strip_prefix(archive)
            .map(|r| r.strip_prefix("/").unwrap_or(r))?;
        let path = path
            .strip_prefix(root)
            .map(|r| r.strip_prefix("/").unwrap_or(r))?;
        Some(path.to_owned())
    }

    fn extract_entries<R: Read>(
        &self,
        entry: &mut R,
        archive: &str,
        raw: &[u8],
        dest: &str,
        cwd: &str,
    ) -> Result<String> {
        let path = self.decode_path(raw);
        let Some(path) = self.relative_path(archive, &path, cwd) else {
            bail!("Invalid path: {path}");
        };
        let dst = Path::new(dest).join(&path);
        if path.ends_with('/') {
            create_dir_all(&dst)?;
            return Ok("".to_owned());
        }
        if let Some(p) = dst.parent() {
            create_dir_all(p)?;
        }
        if dst.exists() {
            return Ok(dst.to_string_lossy().to_string());
        }
        let mut out = File::create(dst)?;
        copy(entry, &mut out)?;
        Ok("".to_owned())
    }

    fn copy_zip_entries(
        &self,
        archive: &str,
        srcs: &[String],
        dest: &str,
        cwd: &str,
    ) -> Result<Vec<String>> {
        let mut skipped = Vec::new();
        let file = File::open(archive)?;
        let mut zip = zip::ZipArchive::new(file)?;
        for i in 0..zip.len() {
            let raw = {
                let entry = zip.by_index_raw(i)?;
                entry.name_raw().to_owned()
            };
            if !self.is_match(&raw, srcs) {
                continue;
            }
            let mut entry = zip.by_index(i)?;
            let res =
                self.extract_entries(&mut entry, archive, &raw, dest, cwd)?;
            if !res.is_empty() {
                skipped.push(res);
            }
        }
        Ok(skipped)
    }

    fn copy_tarball_entries<R: Read>(
        &self,
        archive: &str,
        tar: &mut tar::Archive<R>,
        srcs: &[String],
        dest: &str,
        cwd: &str,
    ) -> Result<Vec<String>> {
        let mut skipped = Vec::new();
        for entry in tar.entries()? {
            let mut entry = entry?;
            let mut raw = entry.header().path_bytes().into_owned();
            let str_p = String::from_utf8_lossy(&raw);
            // USTAR ではファイル名が 100 バイトに制限されている。
            // 途中で切れていそうなら path() にフォールバックする。
            if raw.len() >= 100 || str_p.contains('\0') {
                if let Ok(path) = entry.path() {
                    raw = path.into_owned().into_os_string().into_vec();
                }
            }
            if !self.is_match(&raw, srcs) {
                continue;
            }
            let res =
                self.extract_entries(&mut entry, archive, &raw, dest, cwd)?;
            if !res.is_empty() {
                skipped.push(res);
            }
        }
        Ok(skipped)
    }

    fn copy_tar_entries(
        &self,
        archive: &str,
        srcs: &[String],
        dest: &str,
        cwd: &str,
    ) -> Result<Vec<String>> {
        let file = File::open(archive)?;
        let mut tar = tar::Archive::new(file);
        let skipped =
            self.copy_tarball_entries(archive, &mut tar, srcs, dest, cwd)?;
        Ok(skipped)
    }

    fn copy_tgz_entries(
        &self,
        archive: &str,
        srcs: &[String],
        dest: &str,
        cwd: &str,
    ) -> Result<Vec<String>> {
        let file = File::open(archive)?;
        let reader = BufReader::new(file);
        let decoder = GzDecoder::new(reader);
        let mut tar = tar::Archive::new(decoder);
        let skipped =
            self.copy_tarball_entries(archive, &mut tar, srcs, dest, cwd)?;
        Ok(skipped)
    }
}

#[async_trait]
impl TaskBase for ExtractEntriesTask {
    fn validate(&self, cmd: &Command) -> bool {
        if !self.is_valid_args(&cmd.args) {
            return false;
        }
        if cmd.arg_as_path_array("sources", &cmd.cwd).is_none() {
            return false;
        }
        cmd.arg_as_path("archive", &cmd.cwd).is_some()
            && cmd.arg_as_path("destination", &cmd.cwd).is_some()
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
                "sources": {
                    "type": "array",
                    "items": { "type": "string", "minLength": 1 },
                    "minItems": 1,
                },
                "destination": { "type": "string", "minLength": 1 },
            },
            "required": ["kind", "archive", "sources", "destination"],
            "additionalProperties": false,
        })
    }

    async fn try_run(
        &self,
        cmd: &Command,
        _: &Arc<TaskArg>,
        _: mpsc::Sender<TaskControl>,
    ) -> Result<TaskResult> {
        let kind = cmd.arg_as_str("kind").unwrap();
        let kind = ArchiveKind::from_str(kind)?;
        let archive = cmd.arg_as_path("archive", &cmd.cwd).unwrap();
        let srcs = cmd.arg_as_path_array("sources", &cmd.cwd).unwrap();
        let dest = cmd.arg_as_path("destination", &cmd.cwd).unwrap();
        // ["/path/to/archive.zip/a/b"] -> ["/a/b"]
        let Some(srcs) = srcs
            .into_iter()
            .map(|s| s.strip_prefix(&archive).map(str::to_owned))
            .collect::<Option<Vec<_>>>()
        else {
            let err = VirtualDirError::Args;
            return Ok(TaskResult::error(err.into()));
        };
        let res = match kind {
            ArchiveKind::Zip => {
                self.copy_zip_entries(&archive, &srcs, &dest, &cmd.cwd)
            }
            ArchiveKind::Tar => {
                self.copy_tar_entries(&archive, &srcs, &dest, &cmd.cwd)
            }
            ArchiveKind::Tgz => {
                self.copy_tgz_entries(&archive, &srcs, &dest, &cmd.cwd)
            }
        };
        let res = match res {
            Ok(skipped) if skipped.is_empty() => TaskResult::success(),
            Ok(skipped) => {
                let status = "SKIPPED".to_owned();
                TaskResult::data(skipped.into(), Some(status))
            }
            Err(err) => TaskResult::error(err),
        };
        Ok(res)
    }
}

#[cfg(test)]
mod tests {
    use crate::test_helpers::{
        assert_by_schema, assert_err, create_command, setup_sender,
        setup_task_arg, teardown_resources,
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
        ExtractEntriesTask,
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
        let task = ExtractEntriesTask::new();
        let (tx, _) = mpsc::channel::<TaskControl>(10);
        Ok((root, task_arg, task, tx))
    }

    #[tokio::test]
    async fn test_validate_by_schema() -> Result<()> {
        let (path, _task_arg, task, _) = setup("").await?;
        let fx_path = "./tests/fixtures/extract_entries_task.json";
        assert_by_schema(fx_path, "_", &path, &task).await?;
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
                "sources": [nfc("1 ゲーム"), "1 text.txt", ".hidden_file"],
                "destination": &path,
            });
            let cmd = create_command(&archive, "_", args)?;
            let res = task.run(&cmd, &task_arg, tx.clone()).await;
            assert!(matches!(res, TaskResult::Success(_)));
            let p = path.clone();
            let fmt = move |s: &str| nfc(&format!("{p}/1 ゲーム/{s}"));
            let p1 = fmt("1 テキスト.txt");
            let p2 = fmt("2 空ディレクトリ");
            let p3 = fmt("1 オープンワールド/2 画像.jpg");
            assert!(Path::new(&p1).is_file());
            assert!(Path::new(&p2).is_dir());
            assert!(Path::new(&p3).is_file());

            let args = json!({
                "kind": kind,
                "archive": &archive,
                "sources": ["1 text.txt"],
                "destination": &path,
            });
            let cmd = create_command(&archive, "_", args)?;
            let TaskResult::Data(res) =
                task.run(&cmd, &task_arg, tx.clone()).await
            else {
                unreachable!();
            };
            let skipped: Vec<String> = serde_json::from_value(res.data)?;
            assert!(skipped[0].ends_with("/1 text.txt"));
            assert!(res.status.is_some());

            let mut cwd = format!("{archive}/1 ゲーム/1 オープンワールド");
            cwd = nfc(&cwd);
            let args = json!({
                "kind": kind,
                "archive": &archive,
                "sources": ["2 画像.jpg", nfc("1 空ディレクトリ")],
                "destination": &path,
            });
            let cmd = create_command(&cwd, "_", args)?;
            let res = task.run(&cmd, &task_arg, tx.clone()).await;
            assert!(matches!(res, TaskResult::Success(_)));
            let p = path.clone();
            let fmt = move |s: &str| {
                nfc(&format!("{p}/1 ゲーム/1 オープンワールド/{s}"))
            };
            let p1 = fmt("1 テキスト.txt");
            let p2 = fmt("2 画像.jpg");
            let p3 = fmt("1 空ディレクトリ");
            assert!(Path::new(&p1).is_file());
            assert!(Path::new(&p2).is_file());
            assert!(Path::new(&p3).is_dir());

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
            "sources": ["1 text.txt", "2 image.jpg"],
            "destination": &path
        });
        let cmd = create_command("/foo/bar", "_", args)?;
        let TaskResult::Error(res) = task.run(&cmd, &task_arg, tx).await else {
            unreachable!();
        };
        assert_err(&res.err, &VirtualDirError::Args);
        teardown_resources(&path).await?;
        Ok(())
    }
}
