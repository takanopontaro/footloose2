/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { messages } from './messages';

import type { CommandsConfig } from '@modules/App/types';

const commands: CommandsConfig = [
  {
    name: 'None',
    action(api, combo) {
      // No action
    },
  },

  // フォーカス操作系
  {
    name: 'FocusDataFrame',
    action(api, combo) {
      api.focusDataFrame();
    },
  },
  {
    name: 'FocusOtherDataFrame',
    action(api, combo) {
      api.focusOtherDataFrame();
    },
  },
  {
    name: 'FocusDataFrameA',
    action(api, combo) {
      api.focusDataFrameA();
    },
  },
  {
    name: 'FocusDataFrameB',
    action(api, combo) {
      api.focusDataFrameB();
    },
  },
  {
    name: 'FocusEntryFilter',
    action(api, combo) {
      api.focusEntryFilter();
    },
  },
  {
    name: 'FocusLogFrame',
    action(api, combo) {
      api.focusLogFrame();
    },
  },
  {
    name: 'FocusListModal',
    action(api, combo) {
      api.focusListModal();
    },
  },
  {
    name: 'FocusListModalEntryFilter',
    action(api, combo) {
      api.focusListModalEntryFilter();
    },
  },
  {
    name: 'FocusPromptModal',
    action(api, combo) {
      api.focusPromptModal();
    },
  },
  {
    name: 'FocusConfirmModal',
    action(api, combo) {
      api.focusConfirmModal();
    },
  },

  // カーソル移動系
  {
    name: 'MoveCursor',
    action(api, combo, { direction, loop, step }) {
      api.moveCursor(step, direction, loop);
    },
  },
  {
    name: 'MoveCursorByPage',
    action(api, combo, { direction }) {
      api.moveCursorByPage(direction);
    },
  },
  {
    name: 'MoveCursorToEdge',
    action(api, combo, { direction }) {
      api.moveCursorToEdge(direction);
    },
  },
  {
    name: 'MoveCursorByStartingLetter',
    action(api, combo) {
      api.moveCursorByStartingLetter(combo);
    },
  },

  // 行選択系
  {
    name: 'ToggleRowSelection',
    action(api, combo) {
      api.toggleRowSelection();
    },
  },
  {
    name: 'SelectAllRows',
    action(api, combo) {
      api.selectAllRows();
    },
  },
  {
    name: 'DeselectAllRows',
    action(api, combo) {
      api.deselectAllRows();
    },
  },
  {
    name: 'InvertAllRowSelections',
    action(api, combo) {
      api.invertAllRowSelections();
    },
  },

  // ディレクトリ操作系
  {
    name: 'HandleEntry',
    action(api, combo) {
      const name = api.getActiveEntryName(undefined, true);
      if (name === '') {
        return;
      }
      const kind = api.getVirtualDirKindFromExt(name);
      if (kind) {
        api.changeVirtualDir(name, kind);
        return;
      }
      if (api.isFile(name)) {
        api.openWith();
        return;
      }
      if (api.isSymlink(name)) {
        const info = api.getSymlinkInfo(name);
        if (!info) {
          return;
        }
        switch (info.type) {
          case 'd':
            api.changeDir(name);
            break;
          case 'f':
            api.openWith();
            break;
          case 'e':
            api.writeLog(`${messages[7]}: ${name} -> ${info.target}`, 'error');
            break;
        }
        return;
      }
      api.changeDir(name);
    },
  },
  {
    name: 'GoToParentDir',
    action(api, combo) {
      api.goToParentDir();
    },
  },
  {
    name: 'GoToDir',
    action(api, combo) {
      api.goToDir('');
    },
  },
  {
    name: 'SyncDestDirPathWithSrcDirPath',
    action(api, combo) {
      api.syncDestDirPathWithSrcDirPath();
    },
  },
  {
    name: 'SyncSrcDirPathWithDestDirPath',
    action(api, combo) {
      api.syncSrcDirPathWithDestDirPath();
    },
  },
  {
    name: 'SwapDirPaths',
    action(api, combo) {
      api.swapDirPaths();
    },
  },

  // 履歴操作系
  {
    name: 'ShowFullHistory',
    action(api, combo) {
      api.showFullHistory();
    },
  },
  {
    name: 'HistoryGo',
    action(api, combo, { delta }) {
      api.historyGo(delta);
    },
  },

  // ブックマーク操作系
  {
    name: 'ShowAllBookmarks',
    action(api, combo) {
      api.showAllBookmarks();
    },
  },
  {
    name: 'BookmarkCurrentDir',
    action(api, combo) {
      api.bookmarkCurrentDir();
    },
  },

  // コマンド系
  {
    name: 'CopySrcPathsToClipboard',
    action(api, combo) {
      api.copySrcPathsToClipboard();
    },
  },
  {
    name: 'CopySrcDirPathToClipboard',
    action(api, combo) {
      api.copySrcDirPathToClipboard();
    },
  },
  {
    name: 'OpenWith',
    action(api, combo) {
      api.openWith();
    },
  },

  // ファイル操作系
  {
    name: 'CopyEntries',
    async action(api, combo) {
      const label = 'copy entries';
      if (!api.ensureNotVirtualDir('all', label)) {
        return;
      }
      await api.runProgressTask((entries, srcDir, destDir) => {
        if (entries.length === 0) {
          return null;
        }
        return {
          label,
          cmd: `
for src in %s; do
  dest=%d/$(basename "$src")
  if [ -e "$dest" ]; then
    echo "cp: cannot overwrite '$dest': Entry exists" >&2
    exit 1
  fi
done

cp -rv %s %d`,
          total: 'find %s | wc -l',
          src: entries.map((e) => e.name),
          dest: destDir.path,
        };
      });
    },
  },
  {
    name: 'MoveEntries',
    async action(api, combo) {
      const label = 'move entries';
      if (!api.ensureNotVirtualDir('all', label)) {
        return;
      }
      await api.runProgressTask((entries, srcDir, destDir) => {
        if (entries.length === 0) {
          return null;
        }
        return {
          label,
          cmd: `
for src in %s; do
  dest=%d/$(basename "$src")
  if [ -e "$dest" ]; then
    echo "mv: cannot move '$src' to '$dest': Entry exists" >&2
    exit 1
  fi
done

mv -v %s -t %d`,
          total: 'node -e "console.log(process.argv.length - 1)" %s',
          src: entries.map((e) => e.name),
          dest: destDir.path,
        };
      });
    },
  },
  {
    name: 'RemoveEntries',
    async action(api, combo) {
      const label = 'remove entries';
      if (!api.ensureNotVirtualDir('src', label)) {
        return;
      }
      const names = api.getTargetEntryNames();
      if (names.length === 0) {
        return;
      }
      const confirmed = await api.showConfirmModal(messages[6]);
      if (!confirmed) {
        return;
      }
      await api.runProgressTask((entries, srcDir, destDir) => {
        return {
          label,
          cmd: 'rm -vr %s',
          total: 'find %s | wc -l',
          src: entries.map((e) => e.name),
        };
      });
    },
  },
  {
    name: 'RenameEntry',
    async action(api, combo) {
      if (!api.ensureNotVirtualDir('src', 'rename entries')) {
        return;
      }
      const name = api.getActiveEntryName();
      if (name === '') {
        return;
      }
      const input = await api.showPromptModal('', name);
      if (input === '' || input === name) {
        return;
      }
      await api.runShTask((entries, srcDir, destDir) => {
        return {
          log: `rename: ${name} -> ${input}`,
          cmd: 'mv -n %s %d',
          src: [name],
          dest: `${srcDir.path}/${input}`,
        };
      });
    },
  },
  {
    name: 'CreateDir',
    async action(api, combo) {
      if (!api.ensureNotVirtualDir('src', 'create directory')) {
        return;
      }
      const input = await api.showPromptModal('', 'untitled folder');
      if (input === '') {
        return;
      }
      await api.runShTask((entries, srcDir, destDir) => {
        return {
          log: `mkdir: ${input}`,
          cmd: 'mkdir %d',
          dest: `${srcDir.path}/${input}`,
        };
      });
    },
  },
  {
    name: 'CreateFile',
    async action(api, combo) {
      if (!api.ensureNotVirtualDir('src', 'create file')) {
        return;
      }
      const input = await api.showPromptModal('', 'untitled');
      if (input === '') {
        return;
      }
      await api.runShTask((entries, srcDir, destDir) => {
        return {
          log: `touch: ${input}`,
          cmd: 'touch %d',
          dest: `${srcDir.path}/${input}`,
        };
      });
    },
  },

  // 圧縮ファイル系
  {
    name: 'Unarchive',
    async action(api, combo) {
      const label = 'unarchive';
      if (!api.ensureNotVirtualDir('all', label)) {
        return;
      }
      const name = api.getActiveEntryName();
      if (name === '') {
        return;
      }
      switch (true) {
        case name.endsWith('.tar'):
          await api.execCommand('UntarArchives', combo);
          break;
        case name.endsWith('.tgz') || name.endsWith('.tar.gz'):
          await api.execCommand('UntgzArchives', combo);
          break;
        default:
          await api.execCommand('UnzipArchives', combo);
          break;
      }
    },
  },
  {
    name: 'ZipEntries',
    async action(api, combo) {
      const label = 'zip entries';
      if (!api.ensureNotVirtualDir('all', label)) {
        return;
      }
      const names = api.getTargetEntryNames();
      if (names.length === 0) {
        return;
      }
      const input = await api.showPromptModal('', `${names[0]}.zip`);
      if (input === '') {
        return;
      }
      await api.runProgressTask((entries, srcDir, destDir) => {
        return {
          label,
          cmd: `
if [ -e %d ]; then
  echo "zip: '%d' already exists" >&2
  exit 1
fi

zip -r %d %s`,
          total: 'find %s | wc -l',
          src: entries.map((e) => e.name),
          dest: `${destDir.path}/${input}`,
        };
      });
    },
  },
  {
    name: 'UnzipArchives',
    async action(api, combo) {
      const label = 'unzip archives';
      if (!api.ensureNotVirtualDir('all', label)) {
        return;
      }
      await api.runProgressTask((entries, srcDir, destDir) => {
        if (entries.length === 0) {
          return null;
        }
        return {
          label,
          cmd: 'unzip -n %s -d %d',
          total: 'zipinfo -1 %s | LC_ALL=C grep -v "/$" | wc -l',
          src: [entries[0].name],
          dest: destDir.path,
        };
      });
    },
  },
  {
    name: 'TarEntries',
    async action(api, combo) {
      const label = 'tar entries';
      if (!api.ensureNotVirtualDir('all', label)) {
        return;
      }
      const names = api.getTargetEntryNames();
      if (names.length === 0) {
        return;
      }
      const input = await api.showPromptModal('', `${names[0]}.tar`);
      if (input === '') {
        return;
      }
      await api.runProgressTask((entries, srcDir, destDir) => {
        return {
          label,
          cmd: `
if [ -e %d ]; then
  echo "tar: '%d' already exists" >&2
  exit 1
fi

tar cvf %d %s`,
          total: 'find %s | wc -l',
          src: entries.map((e) => e.name),
          dest: `${destDir.path}/${input}`,
        };
      });
    },
  },
  {
    name: 'UntarArchives',
    async action(api, combo) {
      const label = 'untar archives';
      if (!api.ensureNotVirtualDir('all', label)) {
        return;
      }
      await api.runProgressTask((entries, srcDir, destDir) => {
        if (entries.length === 0) {
          return null;
        }
        return {
          label,
          cmd: 'tar xvkf %s -C %d',
          total: 'tar -tf %s | LC_ALL=C grep -v "/$" | wc -l',
          src: [entries[0].name],
          dest: destDir.path,
        };
      });
    },
  },
  {
    name: 'TgzEntries',
    async action(api, combo) {
      const label = 'tgz entries';
      if (!api.ensureNotVirtualDir('all', label)) {
        return;
      }
      const names = api.getTargetEntryNames();
      if (names.length === 0) {
        return;
      }
      const input = await api.showPromptModal('', `${names[0]}.tgz`);
      if (input === '') {
        return;
      }
      await api.runProgressTask((entries, srcDir, destDir) => {
        return {
          label,
          cmd: `
if [ -e %d ]; then
  echo "tgz: '%d' already exists" >&2
  exit 1
fi

tar cvfz %d %s`,
          total: 'find %s | wc -l',
          src: entries.map((e) => e.name),
          dest: `${destDir.path}/${input}`,
        };
      });
    },
  },
  {
    name: 'UntgzArchives',
    async action(api, combo) {
      const label = 'untgz archives';
      if (!api.ensureNotVirtualDir('all', label)) {
        return;
      }
      await api.runProgressTask((entries, srcDir, destDir) => {
        if (entries.length === 0) {
          return null;
        }
        return {
          label,
          cmd: 'tar xvkfz %s -C %d',
          total: 'tar -ztf %s | LC_ALL=C grep -v "/$" | wc -l',
          src: [entries[0].name],
          dest: destDir.path,
        };
      });
    },
  },

  // ソート系
  {
    name: 'SortEntries',
    action(api, combo, { field, order }) {
      api.sortEntries(field, order);
    },
  },
  {
    name: 'CycleSortOrder',
    action(api, combo, { field }) {
      api.cycleSortOrder(field);
    },
  },
  {
    name: 'ClearSort',
    action(api, combo) {
      api.clearSort();
    },
  },
  {
    name: 'CycleDirPosition',
    action(api, combo) {
      api.cycleDirPosition();
    },
  },

  // virtual-dir モード系
  {
    name: 'HandleVirtualEntry',
    action(api, combo) {
      const name = api.getActiveEntryName(undefined, true);
      if (name === '') {
        return;
      }
      if (api.isDir(name)) {
        api.changeVirtualDir();
      }
    },
  },
  {
    name: 'GoToParentVirtualDir',
    action(api, combo) {
      api.goToParentVirtualDir();
    },
  },
  {
    name: 'ExtractSelectedEntries',
    action(api, combo) {
      if (api.ensureNotVirtualDir('dest', 'extract entries')) {
        api.extractSelectedEntries();
      }
    },
  },

  // gallery モード系
  {
    name: 'EnterGalleryMode',
    action(api, combo) {
      api.enterGalleryMode();
    },
  },
  {
    name: 'ExitGalleryMode',
    action(api, combo) {
      api.exitGalleryMode();
    },
  },
  {
    name: 'ToggleGalleryMode',
    action(api, combo) {
      api.toggleGalleryMode();
    },
  },

  // preview モード系
  {
    name: 'ShowPreviewArea',
    action(api, combo) {
      api.showPreviewArea();
    },
  },
  {
    name: 'HidePreviewArea',
    action(api, combo) {
      api.hidePreviewArea();
    },
  },
  {
    name: 'TogglePreviewArea',
    action(api, combo) {
      api.togglePreviewArea();
    },
  },
  {
    name: 'ScrollPreviewArea',
    action(api, combo, { step }) {
      api.scrollPreviewArea(step);
    },
  },
  {
    name: 'ScrollByPagePreviewArea',
    action(api, combo, { direction }) {
      api.scrollByPagePreviewArea(direction);
    },
  },
  {
    name: 'ScrollToEdgePreviewArea',
    action(api, combo, { direction }) {
      api.scrollToEdgePreviewArea(direction);
    },
  },

  // マッチモード系
  {
    name: 'SetNormalMatchMode',
    action(api, combo) {
      api.setNormalMatchMode();
    },
  },
  {
    name: 'SetRegexMatchMode',
    action(api, combo) {
      api.setRegexMatchMode();
    },
  },
  {
    name: 'SetMigemoMatchMode',
    action(api, combo) {
      api.setMigemoMatchMode();
    },
  },
  {
    name: 'CycleMatchMode',
    action(api, combo) {
      api.cycleMatchMode();
    },
  },

  // LogFrame 操作系
  {
    name: 'ClearAllLogs',
    action(api, combo) {
      api.clearAllLogs();
    },
  },
  {
    name: 'ScrollLogFrame',
    action(api, combo, { step }) {
      api.scrollLogFrame(step);
    },
  },
  {
    name: 'ScrollByPageLogFrame',
    action(api, combo, { direction }) {
      api.scrollByPageLogFrame(direction);
    },
  },
  {
    name: 'ScrollToEdgeLogFrame',
    action(api, combo, { direction }) {
      api.scrollToEdgeLogFrame(direction);
    },
  },

  // EntryFilter 操作系
  {
    name: 'ClearEntryFilter',
    action(api, combo) {
      api.clearEntryFilter();
    },
  },

  // ListModal 操作系
  {
    name: 'MoveCursorListModal',
    action(api, combo, { step }) {
      api.moveCursorListModal(step);
    },
  },
  {
    name: 'ExecutePrimaryActionListModal',
    action(api, combo) {
      api.executePrimaryActionListModal();
    },
  },
  {
    name: 'ExecuteSecondaryActionListModal',
    action(api, combo) {
      api.executeSecondaryActionListModal();
    },
  },
  {
    name: 'ExecuteCancelActionListModal',
    action(api, combo) {
      api.executeCancelActionListModal();
    },
  },
  {
    name: 'ClearListModalFilterQuery',
    action(api, combo) {
      api.clearListModalFilterQuery();
    },
  },
  {
    name: 'SetNormalMatchModeListModal',
    action(api, combo) {
      api.setNormalMatchModeListModal();
    },
  },
  {
    name: 'SetRegexMatchModeListModal',
    action(api, combo) {
      api.setRegexMatchModeListModal();
    },
  },
  {
    name: 'SetMigemoMatchModeListModal',
    action(api, combo) {
      api.setMigemoMatchModeListModal();
    },
  },
  {
    name: 'CycleMatchModeListModal',
    action(api, combo) {
      api.cycleMatchModeListModal();
    },
  },

  // PromptModal 操作系
  {
    name: 'FocusElementPromptModal',
    action(api, combo, { direction }) {
      api.focusElementPromptModal(direction);
    },
  },
  {
    name: 'ExecuteActionPromptModal',
    action(api, combo) {
      api.executeActionPromptModal();
    },
  },
  {
    name: 'ExecuteCancelActionPromptModal',
    action(api, combo) {
      api.executeCancelActionPromptModal();
    },
  },

  // ConfirmModal 操作系
  {
    name: 'FocusElementConfirmModal',
    action(api, combo, { direction }) {
      api.focusElementConfirmModal(direction);
    },
  },
  {
    name: 'ExecuteActionConfirmModal',
    action(api, combo) {
      api.executeActionConfirmModal();
    },
  },
  {
    name: 'ExecuteCancelActionConfirmModal',
    action(api, combo) {
      api.executeCancelActionConfirmModal();
    },
  },
];

export { commands };
