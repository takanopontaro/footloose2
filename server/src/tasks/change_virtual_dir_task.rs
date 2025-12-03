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

/// 仮想ディレクトリを変更するタスク。
///
/// # Fields
/// * `watch_manager` - WatchManager インスタンス
/// * `time_style` - 日時のフォーマット文字列
pub struct ChangeVirtualDirTask {
    watch_manager: Arc<Mutex<WatchManager>>,
    time_style: String,
}

impl ChangeVirtualDirTask {
    /// 新しい ChangeVirtualDirTask インスタンスを生成する。
    ///
    /// # Arguments
    /// * `watch_manager` - WatchManager インスタンス
    /// * `time_style` - 日時のフォーマット文字列
    pub fn new(
        watch_manager: Arc<Mutex<WatchManager>>,
        time_style: &str,
    ) -> Self {
        Self {
            watch_manager,
            time_style: time_style.to_owned(),
        }
    }

    /// 指定したパスの親ディレクトリのパスを取得する。
    ///
    /// パスがルートの場合、`/` を返す。
    ///
    /// # Arguments
    /// * `path` - パス文字列
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

    /// パスが有効か否かを検証する。
    ///
    /// # Arguments
    /// * `path` - 検証するパス
    /// * `cwd` - 基準となるディレクトリ
    /// * `filter` - フィルタ用の正規表現
    ///   Mac のリソースフォークなど、除外したいパスがある場合に指定する。
    fn validate_path(
        &self,
        path: &str,
        cwd: &str,
        filter: &Option<Regex>,
    ) -> bool {
        // カレントディレクトリ外のパスは無効とする。
        if !path.starts_with(cwd) {
            return false;
        }
        // フィルタが指定されていない場合は無条件で有効とする。
        if filter.is_none() {
            return true;
        }
        let re = filter.as_ref().unwrap();
        let path = path.strip_prefix(cwd).unwrap();
        // フィルタにマッチ「しない」場合に有効とする。
        !re.is_match(path)
    }

    /// 空のディレクトリエントリを生成する。
    ///
    /// # Arguments
    /// * `name` - ディレクトリ名
    fn dir_entry(&self, name: &str) -> Entry {
        Entry {
            perm: "d---------".to_owned(),
            name: name.to_owned(),
            size: ls_style_size(0),
            time: "--/--/-- --:--:--".to_owned(),
            link: String::new(),
        }
    }

    /// アーカイブ内のエントリ一覧を取得する。
    ///
    /// # Arguments
    /// * `kind` - アーカイブの種類
    /// * `archive` - アーカイブファイルのパス
    /// * `cwd` - 基準となるディレクトリ
    /// * `filter` - フィルタ用の正規表現
    ///   Mac のリソースフォークなど、除外したいパスがある場合に指定する。
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
            // 以下のように整形する。
            // /foo/bar -> foo/bar/
            cwd = cwd[1..].to_string() + "/";
        }
        let parent_p = self.parent_path(&cwd);
        let mut archive: Box<dyn Archive> = match kind {
            ArchiveKind::Zip => Box::new(Zip::new(archive, &self.time_style)?),
            ArchiveKind::Tar => Box::new(Tar::new(archive, &self.time_style)?),
            ArchiveKind::Tgz => Box::new(Tgz::new(archive, &self.time_style)?),
        };

        // 現在のディレクトリに存在するエントリ一覧。
        //
        // 例えばアーカイブの内容が以下だとすると、
        // game/action/image.jpg
        // game/text.txt
        // movies/action/image.jpg
        // movies/text.txt
        // text.txt
        //
        // 格納されるエントリ一覧は以下となる。
        // game
        // movies
        // text.txt
        let mut entries: Vec<Entry> = vec![];

        // スラッシュを含まない 1 セグメント (末尾スラッシュは OK) を表す。
        // OK: foo.txt, bar.jpg, foo/, bar/
        // NG: foo/bar/, foo/bar.txt, foo/bar/baz/foobar.jpg
        //
        // 現在のディレクトリにあるエントリか否かを判別するために使用する。
        // アーカイブには全エントリのパスが入っており、下層や上層のエントリも含まれる。
        // 欲しいのは現在のディレクトリにあるエントリ一覧なため、この判別が必要にある。
        //
        // foo.txt, bar.jpg は通常エントリ、foo/, bar/ はディレクトリエントリである。
        // 一方 foo/bar/, foo/bar.txt は現在より下層にあるエントリである。
        let re_entry = Regex::new(r"^[^/]+/?$").unwrap();

        // 現在のディレクトリにあるディレクトリを取得するために使用される。
        // 最低でもひとつのスラッシュが含まれている必要がある。
        // OK: foo/, foo/bar/, foo/bar/baz.txt
        // NG: foo.txt, bar.jpg, foo, bar
        //
        // foo/bar/baz.txt の場合、foo がキャプチャされる。
        // bar/ の場合、bar がキャプチャされる。
        let re_dir = Regex::new(r"^([^/]+)/").unwrap();

        // アーカイブに含まれる全エントリをひとつずつ処理する。
        // アーカイブの作成方法によって、ディレクトリエントリが含まれる場合と
        // 含まれない場合があることに注意。
        // ディレクトリエントリがある場合、タイムスタンプ等のリアルなメタ情報を持った、
        // ディレクトリのエントリインスタンスを作成できる。ない場合はダミーとなる。
        //
        // ディレクトリエントリあり：
        // game/
        // game/action/
        // game/action/image.jpg
        // game/text.txt
        // movies/
        // movies/action/
        // movies/action/image.jpg
        // movies/text.txt
        // text.txt
        //
        // ディレクトリエントリなし：
        // game/action/image.jpg
        // game/text.txt
        // movies/action/image.jpg
        // movies/text.txt
        // text.txt
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

            // 通常エントリ：
            // cwd: rust/util/
            // path: rust/util/ascii/src/main.rs
            // -> name: ascii/src/main.rs
            //
            // ディレクトリエントリ：
            // cwd: rust/util/
            // path: rust/util/ascii/src/
            // -> name: ascii/src/
            let mut name = path.strip_prefix(&cwd).unwrap_or(&path);

            // re_entry にマッチするということは、アーカイブ内にエントリ情報が
            // あったということだから、entry メソッドを使ってエントリを作成できる。
            // タイムスタンプ等のメタ情報はリアルなものが設定される。
            if re_entry.is_match(name) {
                name = name.strip_suffix("/").unwrap_or(name);
                let ent = entry.entry(name);
                entries.push(ent);
                continue;
            }

            // 現在のディレクトリにあるディレクトリの取得を試みる。
            let Some(caps) = re_dir.captures(name) else {
                continue;
            };

            // re_entry にマッチしなかったのでアーカイブ内にエントリ情報はない。
            // つまりディレクトリエントリが含まれないタイプのアーカイブファイルである。
            // この場合、自前でディレクトリエントリを作成する必要がある。
            let dir = &caps[1];

            // すでに同じ名前のディレクトリエントリが作成済みならスキップする。
            // 例えば foo/bar/ -> foo/bar/a.txt -> foo/bar/baz/b.jpg という
            // ループ処理の時、foo が重複作成されないようにする。
            let exists = entries.iter().any(|e| e.name == dir);
            if exists {
                continue;
            }

            // ディレクトリエントリを作成して格納する。
            // 自前なのでタイムスタンプ等のメタ情報はダミーである。
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

        // `path` には
        // アーカイブのファイルシステムパス＋仮想ディレクトリのパス
        // が格納されている。
        //
        // 例： /Users/xxxx/Desktop/archive.zip/movies/action/
        // ここからアーカイブのパスを取り除いて、仮想ディレクトリのパスを取得する。
        // -> /movies/action/
        //
        // None の場合、アーカイブ外のパスを指定していることになるため
        // VirtualDirError::OutsideRoot を返す。
        let Some(cwd) = path.strip_prefix(&archive) else {
            let err = VirtualDirError::OutsideRoot;
            return Ok(TaskResult::error(err.into()));
        };

        let res = match self.get_entries(&kind, &archive, cwd, &filter) {
            Ok(data) => {
                let manager = self.watch_manager.lock().await;
                // 無事仮想ディレクトリ内に入れたため、現在の監視パスは解除しておく。
                // 空文字を指定することで確実に解除できる。
                // ちなみに仮想ディレクトリ内は監視対象外である。
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
