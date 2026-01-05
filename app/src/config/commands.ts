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
        const { target, type } = api.getSymlinkInfo(name) ?? {};
        if (type === 'd') {
          api.changeDir(name);
        } else if (type === 'f') {
          api.openWith();
        } else if (type === 'e') {
          api.writeLog(`${messages[7]}: ${name} -> ${target}`, 'error');
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
      api.goToDir();
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
      await api.runProgressTask((entries, srcDir, destDir) => {
        if (srcDir.isVirtual || destDir.isVirtual) {
          return null;
        }
        return {
          label: 'copy entries',
          cmd: 'cp -rvn %s %d',
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
      await api.runProgressTask((entries, srcDir, destDir) => {
        if (srcDir.isVirtual || destDir.isVirtual) {
          return null;
        }
        return {
          label: 'move entries',
          cmd: 'mv -vn %s -t %d',
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
      const res = await api.showConfirmModal(messages[6]);
      if (!res) {
        return;
      }
      await api.runProgressTask((entries, srcDir, destDir) => {
        if (srcDir.isVirtual) {
          return null;
        }
        return {
          label: 'remove entries',
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
      await api.runShTask(async (entries, srcDir, destDir) => {
        if (entries.length === 0 || srcDir.isVirtual) {
          return null;
        }
        const target = entries[0].name;
        const input = await api.showPromptModal(target);
        if (input === '' || input === target) {
          return null;
        }
        return {
          log: `rename: ${target} -> ${input}`,
          cmd: 'mv -n %s %d',
          src: [target],
          dest: `${srcDir.path}/${input}`,
        };
      });
    },
  },
  {
    name: 'CreateDir',
    async action(api, combo) {
      const input = await api.showPromptModal('untitled folder');
      if (input === '') {
        return;
      }
      await api.runShTask((entries, srcDir, destDir) => {
        if (srcDir.isVirtual) {
          return null;
        }
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
      const input = await api.showPromptModal('untitled');
      if (input === '') {
        return;
      }
      await api.runShTask((entries, srcDir, destDir) => {
        if (srcDir.isVirtual) {
          return null;
        }
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
    name: 'ZipEntries',
    async action(api, combo) {
      const names = api.getTargetEntryNames();
      if (names.length === 0) {
        return;
      }
      const input = await api.showPromptModal(`${names[0]}.zip`);
      if (input === '') {
        return;
      }
      await api.runProgressTask((entries, srcDir, destDir) => {
        if (entries.length === 0 || srcDir.isVirtual || destDir.isVirtual) {
          return null;
        }
        return {
          label: 'zip entries',
          cmd: 'zip -r %d %s',
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
      await api.runProgressTask((entries, srcDir, destDir) => {
        if (entries.length === 0 || srcDir.isVirtual || destDir.isVirtual) {
          return null;
        }
        return {
          label: 'unzip archives',
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
      const names = api.getTargetEntryNames();
      if (names.length === 0) {
        return;
      }
      const input = await api.showPromptModal(`${names[0]}.tar`);
      if (input === '') {
        return;
      }
      await api.runProgressTask((entries, srcDir, destDir) => {
        if (entries.length === 0 || srcDir.isVirtual || destDir.isVirtual) {
          return null;
        }
        return {
          label: 'tar entries',
          cmd: 'tar cvf %d %s',
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
      await api.runProgressTask((entries, srcDir, destDir) => {
        if (entries.length === 0 || srcDir.isVirtual || destDir.isVirtual) {
          return null;
        }
        return {
          label: 'untar archives',
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
      const names = api.getTargetEntryNames();
      if (names.length === 0) {
        return;
      }
      const input = await api.showPromptModal(`${names[0]}.tgz`);
      if (input === '') {
        return;
      }
      await api.runProgressTask((entries, srcDir, destDir) => {
        if (entries.length === 0 || srcDir.isVirtual || destDir.isVirtual) {
          return null;
        }
        return {
          label: 'tgz entries',
          cmd: 'tar cvfz %d %s',
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
      await api.runProgressTask((entries, srcDir, destDir) => {
        if (entries.length === 0 || srcDir.isVirtual || destDir.isVirtual) {
          return null;
        }
        return {
          label: 'untgz archives',
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
      api.extractSelectedEntries();
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
