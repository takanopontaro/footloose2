/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type {
  AssociationsConfig,
  CommandsConfig,
  Config,
  MessagesConfig,
  SettingsConfig,
  ShortcutsConfig,
} from '@modules/App/types';

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
      const name = api.getTargetName(undefined, true);
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
    name: 'BookmarkSrcDirPath',
    action(api, combo) {
      api.bookmarkSrcDirPath();
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
      await api.runProgressTask((targetNames, srcDir, destDir) => ({
        label: 'copy entries',
        cmd: 'cp -rvn %s %d',
        total: 'find %s | wc -l',
        src: targetNames,
        dest: destDir,
      }));
    },
  },
  {
    name: 'MoveEntries',
    async action(api, combo) {
      await api.runProgressTask((targetNames, srcDir, destDir) => ({
        label: 'move entries',
        cmd: 'mv -vn %s -t %d',
        total: 'node -e "console.log(process.argv.length - 1)" %s',
        src: targetNames,
        dest: destDir,
      }));
    },
  },
  {
    name: 'RemoveEntries',
    async action(api, combo) {
      const res = await api.showConfirmModal(messages[6]);
      if (res === '') {
        return;
      }
      await api.runProgressTask((targetNames, srcDir, destDir) => ({
        label: 'remove entries',
        cmd: 'rm -vr %s',
        total: 'find %s | wc -l',
        src: targetNames,
      }));
    },
  },
  {
    name: 'RenameEntry',
    async action(api, combo) {
      await api.runShTask(async (targetNames, srcDir, destDir) => {
        const target = targetNames[0];
        const input = await api.showPromptModal(target);
        if (input === '' || input === target) {
          return null;
        }
        return {
          log: `rename: ${target} -> ${input}`,
          cmd: 'mv -n %s %d',
          src: [target],
          dest: `${srcDir}/${input}`,
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
      await api.runShTask((targetNames, srcDir, destDir) => ({
        log: `mkdir: ${input}`,
        cmd: 'mkdir %d',
        dest: `${srcDir}/${input}`,
      }));
    },
  },
  {
    name: 'CreateFile',
    async action(api, combo) {
      const input = await api.showPromptModal('untitled');
      if (input === '') {
        return;
      }
      await api.runShTask((targetNames, srcDir, destDir) => ({
        log: `touch: ${input}`,
        cmd: 'touch %d',
        dest: `${srcDir}/${input}`,
      }));
    },
  },

  // 圧縮ファイル系
  {
    name: 'ZipEntries',
    async action(api, combo) {
      const input = await api.showPromptModal('archive.zip');
      if (input === '') {
        return;
      }
      await api.runProgressTask((targetNames, srcDir, destDir) => ({
        label: 'zip entries',
        cmd: 'zip -r %d %s',
        total: 'find %s | wc -l',
        src: targetNames,
        dest: `${destDir}/${input}`,
      }));
    },
  },
  {
    name: 'UnzipArchives',
    async action(api, combo) {
      await api.runProgressTask((targetNames, srcDir, destDir) => ({
        label: 'unzip archives',
        cmd: 'unzip -n %s -d %d',
        total: 'zipinfo -1 %s | LC_ALL=C grep -v "/$" | wc -l',
        src: [targetNames[0]],
        dest: destDir,
      }));
    },
  },
  {
    name: 'TarEntries',
    async action(api, combo) {
      const input = await api.showPromptModal('archive.tar');
      if (input === '') {
        return;
      }
      await api.runProgressTask((targetNames, srcDir, destDir) => ({
        label: 'tar entries',
        cmd: 'tar cvf %d %s',
        total: 'find %s | wc -l',
        src: targetNames,
        dest: `${destDir}/${input}`,
      }));
    },
  },
  {
    name: 'UntarArchives',
    async action(api, combo) {
      await api.runProgressTask((targetNames, srcDir, destDir) => ({
        label: 'untar archives',
        cmd: 'tar xvkf %s -C %d',
        total: 'tar -tf %s | LC_ALL=C grep -v "/$" | wc -l',
        src: [targetNames[0]],
        dest: destDir,
      }));
    },
  },
  {
    name: 'TgzEntries',
    async action(api, combo) {
      const input = await api.showPromptModal('archive.tgz');
      if (input === '') {
        return;
      }
      await api.runProgressTask((targetNames, srcDir, destDir) => ({
        label: 'tgz entries',
        cmd: 'tar cvfz %d %s',
        total: 'find %s | wc -l',
        src: targetNames,
        dest: `${destDir}/${input}`,
      }));
    },
  },
  {
    name: 'UntgzArchives',
    async action(api, combo) {
      await api.runProgressTask((targetNames, srcDir, destDir) => ({
        label: 'untgz archives',
        cmd: 'tar xvkfz %s -C %d',
        total: 'tar -ztf %s | LC_ALL=C grep -v "/$" | wc -l',
        src: [targetNames[0]],
        dest: destDir,
      }));
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

  // 仮想ディレクトリ系
  {
    name: 'HandleVirtualEntry',
    action(api, combo) {
      const name = api.getTargetName(undefined, true);
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

  // Gallery Mode 系
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

  // Preview Mode 系
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
    name: 'ConfirmPrimaryActionListModal',
    action(api, combo) {
      api.confirmPrimaryActionListModal();
    },
  },
  {
    name: 'ConfirmSecondaryActionListModal',
    action(api, combo) {
      api.confirmSecondaryActionListModal();
    },
  },
  {
    name: 'CancelActionListModal',
    action(api, combo) {
      api.cancelActionListModal();
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
    name: 'ConfirmActionPromptModal',
    action(api, combo) {
      api.confirmActionPromptModal();
    },
  },
  {
    name: 'CancelActionPromptModal',
    action(api, combo) {
      api.cancelActionPromptModal();
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
    name: 'ConfirmActionConfirmModal',
    action(api, combo) {
      api.confirmActionConfirmModal();
    },
  },
  {
    name: 'CancelActionConfirmModal',
    action(api, combo) {
      api.cancelActionConfirmModal();
    },
  },
];

const shortcuts: ShortcutsConfig = {
  DataFrame: {
    '/': [
      {
        cmd: 'FocusEntryFilter',
      },
    ],
    'tab': [
      {
        cmd: 'FocusOtherDataFrame',
      },
    ],
    'shift+tab': [
      {
        cmd: 'FocusLogFrame',
      },
    ],
    'up': [
      {
        cmd: 'MoveCursor',
        args: { step: 1, direction: 'up', loop: true },
        modes: ['!gallery'],
      },
      {
        cmd: 'MoveCursor',
        args: { step: 1, direction: 'up', loop: false },
        modes: ['gallery'],
      },
    ],
    'shift+up': [
      {
        cmd: 'MoveCursor',
        args: { step: 5, direction: 'up', loop: true },
        modes: ['!gallery'],
      },
      {
        cmd: 'MoveCursor',
        args: { step: 5, direction: 'up', loop: false },
        modes: ['gallery'],
      },
    ],
    'left': [
      {
        cmd: 'None',
        modes: ['!gallery'],
      },
      {
        cmd: 'MoveCursor',
        args: { step: 1, direction: 'left', loop: false },
        modes: ['gallery'],
      },
    ],
    'shift+left': [
      {
        cmd: 'None',
        modes: ['!gallery'],
      },
      {
        cmd: 'MoveCursor',
        args: { step: 5, direction: 'left', loop: false },
        modes: ['gallery'],
      },
    ],
    'down': [
      {
        cmd: 'MoveCursor',
        args: { step: 1, direction: 'down', loop: true },
        modes: ['!gallery'],
      },
      {
        cmd: 'MoveCursor',
        args: { step: 1, direction: 'down', loop: false },
        modes: ['gallery'],
      },
    ],
    'shift+down': [
      {
        cmd: 'MoveCursor',
        args: { step: 5, direction: 'down', loop: true },
        modes: ['!gallery'],
      },
      {
        cmd: 'MoveCursor',
        args: { step: 5, direction: 'down', loop: false },
        modes: ['gallery'],
      },
    ],
    'right': [
      {
        cmd: 'None',
        modes: ['!gallery'],
      },
      {
        cmd: 'MoveCursor',
        args: { step: 1, direction: 'right', loop: false },
        modes: ['gallery'],
      },
    ],
    'shift+right': [
      {
        cmd: 'None',
        modes: ['!gallery'],
      },
      {
        cmd: 'MoveCursor',
        args: { step: 5, direction: 'right', loop: false },
        modes: ['gallery'],
      },
    ],
    'pageup': [
      {
        cmd: 'MoveCursorByPage',
        args: { direction: -1 },
      },
    ],
    'pagedown': [
      {
        cmd: 'MoveCursorByPage',
        args: { direction: 1 },
      },
    ],
    'home': [
      {
        cmd: 'MoveCursorToEdge',
        args: { direction: -1 },
      },
    ],
    'end': [
      {
        cmd: 'MoveCursorToEdge',
        args: { direction: 1 },
      },
    ],
    '0': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    '1': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    '2': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    '3': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    '4': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    '5': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    '6': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    '7': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    '8': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    '9': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    'a': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    'b': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    'c': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    'd': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    'e': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    'f': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    'g': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    'h': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    'i': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    'j': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    'k': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    'l': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    'm': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    'n': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    'o': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    'p': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    'q': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    'r': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    's': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    't': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    'u': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    'v': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    'w': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    'x': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    'y': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    'z': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    '_': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    '-': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    '.': [
      {
        cmd: 'MoveCursorByStartingLetter',
      },
    ],
    'space': [
      {
        cmd: 'ToggleRowSelection',
      },
    ],
    'shift+a': [
      {
        cmd: 'SelectAllRows',
      },
    ],
    'shift+ctrl+a': [
      {
        cmd: 'DeselectAllRows',
      },
    ],
    'shift+ctrl+meta+a': [
      {
        cmd: 'InvertAllRowSelections',
      },
    ],
    'enter': [
      {
        cmd: 'HandleEntry',
        modes: ['!virtual-dir'],
      },
      {
        cmd: 'HandleVirtualEntry',
        modes: ['virtual-dir'],
      },
    ],
    'backspace': [
      {
        cmd: 'GoToParentDir',
        modes: ['!virtual-dir'],
      },
      {
        cmd: 'GoToParentVirtualDir',
        modes: ['virtual-dir'],
      },
    ],
    'shift+p': [
      {
        cmd: 'SyncDestDirPathWithSrcDirPath',
      },
    ],
    'shift+ctrl+p': [
      {
        cmd: 'SyncSrcDirPathWithDestDirPath',
      },
    ],
    'shift+ctrl+meta+p': [
      {
        cmd: 'SwapDirPaths',
      },
    ],
    'shift+j': [
      {
        cmd: 'GoToDir',
      },
    ],
    'shift+h': [
      {
        cmd: 'ShowFullHistory',
      },
    ],
    'meta+left': [
      {
        cmd: 'HistoryGo',
        args: { delta: -1 },
      },
    ],
    'meta+right': [
      {
        cmd: 'HistoryGo',
        args: { delta: 1 },
      },
    ],
    'shift+b': [
      {
        cmd: 'ShowAllBookmarks',
      },
    ],
    'shift+ctrl+b': [
      {
        cmd: 'BookmarkSrcDirPath',
      },
    ],
    'plus': [
      {
        cmd: 'CopySrcPathsToClipboard',
      },
    ],
    '=': [
      {
        cmd: 'CopySrcDirPathToClipboard',
      },
    ],
    'shift+c': [
      {
        cmd: 'CopyEntries',
        modes: ['!virtual-dir'],
      },
      {
        cmd: 'ExtractSelectedEntries',
        modes: ['virtual-dir'],
      },
    ],
    'shift+m': [
      {
        cmd: 'MoveEntries',
      },
    ],
    'shift+d': [
      {
        cmd: 'RemoveEntries',
      },
    ],
    'shift+r': [
      {
        cmd: 'RenameEntry',
      },
    ],
    'shift+k': [
      {
        cmd: 'CreateDir',
      },
    ],
    'shift+t': [
      {
        cmd: 'CreateFile',
      },
    ],
    'shift+o': [
      {
        cmd: 'OpenWith',
      },
    ],
    'shift+z': [
      {
        cmd: 'ZipEntries',
      },
    ],
    'shift+u': [
      {
        cmd: 'UnzipArchives',
      },
    ],
    'shift+ctrl+z': [
      {
        cmd: 'TarEntries',
      },
    ],
    'shift+ctrl+u': [
      {
        cmd: 'UntarArchives',
      },
    ],
    'shift+ctrl+meta+z': [
      {
        cmd: 'TgzEntries',
      },
    ],
    'shift+ctrl+meta+u': [
      {
        cmd: 'UntgzArchives',
      },
    ],
    'shift+0': [
      {
        cmd: 'ClearSort',
      },
    ],
    'shift+1': [
      {
        cmd: 'CycleSortOrder',
        args: { field: 'perm' },
      },
    ],
    'shift+2': [
      {
        cmd: 'CycleSortOrder',
        args: { field: 'name' },
      },
    ],
    'shift+3': [
      {
        cmd: 'CycleSortOrder',
        args: { field: 'size' },
      },
    ],
    'shift+4': [
      {
        cmd: 'CycleSortOrder',
        args: { field: 'time' },
      },
    ],
    '~': [
      {
        cmd: 'CycleDirPosition',
      },
    ],
    'shift+g': [
      {
        cmd: 'EnterGalleryMode',
      },
    ],
    'shift+ctrl+g': [
      {
        cmd: 'ExitGalleryMode',
      },
    ],
    'shift+v': [
      {
        cmd: 'ShowPreviewArea',
        modes: ['!preview'],
      },
    ],
    'esc': [
      {
        cmd: 'HidePreviewArea',
        modes: ['preview'],
      },
    ],
    'meta+up': [
      {
        cmd: 'ScrollPreviewArea',
        args: { step: -1 },
        modes: ['preview'],
      },
    ],
    'meta+down': [
      {
        cmd: 'ScrollPreviewArea',
        args: { step: 1 },
        modes: ['preview'],
      },
    ],
    'shift+meta+up': [
      {
        cmd: 'ScrollPreviewArea',
        args: { step: -5 },
        modes: ['preview'],
      },
    ],
    'shift+meta+down': [
      {
        cmd: 'ScrollPreviewArea',
        args: { step: 5 },
        modes: ['preview'],
      },
    ],
    'meta+pageup': [
      {
        cmd: 'ScrollByPagePreviewArea',
        args: { direction: -1 },
        modes: ['preview'],
      },
    ],
    'meta+pagedown': [
      {
        cmd: 'ScrollByPagePreviewArea',
        args: { direction: 1 },
        modes: ['preview'],
      },
    ],
    'meta+home': [
      {
        cmd: 'ScrollToEdgePreviewArea',
        args: { direction: -1 },
        modes: ['preview'],
      },
    ],
    'meta+end': [
      {
        cmd: 'ScrollToEdgePreviewArea',
        args: { direction: 1 },
        modes: ['preview'],
      },
    ],
  },
  EntryFilter: {
    'up': [
      {
        cmd: 'FocusDataFrame',
      },
    ],
    'esc': [
      {
        cmd: 'ClearEntryFilter',
      },
      {
        cmd: 'FocusDataFrame',
      },
    ],
    'enter': [
      {
        cmd: 'FocusDataFrame',
      },
    ],
    'tab': [
      {
        cmd: 'None',
      },
    ],
    'shift+tab': [
      {
        cmd: 'None',
      },
    ],
  },
  LogFrame: {
    'tab': [
      {
        cmd: 'None',
      },
    ],
    'shift+tab': [
      {
        cmd: 'FocusDataFrame',
      },
    ],
    'esc': [
      {
        cmd: 'ClearAllLogs',
      },
    ],
    'up': [
      {
        cmd: 'ScrollLogFrame',
        args: { step: -1 },
      },
    ],
    'down': [
      {
        cmd: 'ScrollLogFrame',
        args: { step: 1 },
      },
    ],
    'shift+up': [
      {
        cmd: 'ScrollLogFrame',
        args: { step: -5 },
      },
    ],
    'shift+down': [
      {
        cmd: 'ScrollLogFrame',
        args: { step: 5 },
      },
    ],
    'pageup': [
      {
        cmd: 'ScrollByPageLogFrame',
        args: { direction: -1 },
      },
    ],
    'pagedown': [
      {
        cmd: 'ScrollByPageLogFrame',
        args: { direction: 1 },
      },
    ],
    'home': [
      {
        cmd: 'ScrollToEdgeLogFrame',
        args: { direction: -1 },
      },
    ],
    'end': [
      {
        cmd: 'ScrollToEdgeLogFrame',
        args: { direction: 1 },
      },
    ],
  },
  ListModal: {
    'up': [
      {
        cmd: 'MoveCursorListModal',
        args: { step: -1 },
      },
    ],
    'down': [
      {
        cmd: 'MoveCursorListModal',
        args: { step: 1 },
      },
    ],
    'enter': [
      {
        cmd: 'ConfirmPrimaryActionListModal',
      },
    ],
    'esc': [
      {
        cmd: 'CancelActionListModal',
      },
    ],
    'backspace': [
      {
        cmd: 'ConfirmSecondaryActionListModal',
        tags: ['ListModal:bookmark'],
      },
    ],
    '/': [
      {
        cmd: 'FocusListModalEntryFilter',
      },
    ],
    'tab': [
      {
        cmd: 'None',
      },
    ],
    'shift+tab': [
      {
        cmd: 'None',
      },
    ],
  },
  ListModalEntryFilter: {
    'down': [
      {
        cmd: 'FocusListModal',
      },
    ],
    'esc': [
      {
        cmd: 'ClearListModalFilterQuery',
      },
      {
        cmd: 'FocusListModal',
      },
    ],
    'enter': [
      {
        cmd: 'FocusListModal',
      },
    ],
    'tab': [
      {
        cmd: 'None',
      },
    ],
    'shift+tab': [
      {
        cmd: 'None',
      },
    ],
  },
  PromptModal: {
    'tab': [
      {
        cmd: 'FocusElementPromptModal',
        args: { direction: 1 },
      },
    ],
    'shift+tab': [
      {
        cmd: 'FocusElementPromptModal',
        args: { direction: -1 },
      },
    ],
    'enter': [
      {
        cmd: 'ConfirmActionPromptModal',
        tags: ['PromptModal:input', 'PromptModal:confirm'],
      },
      {
        cmd: 'CancelActionPromptModal',
        tags: ['PromptModal:cancel'],
      },
    ],
    'esc': [
      {
        cmd: 'CancelActionPromptModal',
      },
    ],
  },
  ConfirmModal: {
    'tab': [
      {
        cmd: 'FocusElementConfirmModal',
        args: { direction: 1 },
      },
    ],
    'shift+tab': [
      {
        cmd: 'FocusElementConfirmModal',
        args: { direction: -1 },
      },
    ],
    'enter': [
      {
        cmd: 'ConfirmActionConfirmModal',
        tags: ['ConfirmModal:confirm'],
      },
      {
        cmd: 'CancelActionConfirmModal',
        tags: ['ConfirmModal:cancel'],
      },
    ],
    'esc': [
      {
        cmd: 'CancelActionConfirmModal',
      },
    ],
  },
};

const messages: MessagesConfig = [
  'No target paths',
  'No bookmarks found',
  'Bookmark added',
  'Bookmark deleted',
  'No history found',
  'Invalid input text',
  'Are you sure?',
  'Broken symlink',
  'Copied selected paths to the clipboard',
  'Failed to copy selected paths to the clipboard',
  'Copied the current path to the clipboard',
  'Failed to copy the current path to the clipboard',
  'Could not determine archive type',
  'Already exists',
];

const settings: SettingsConfig = {
  logScrollAmount: 40,
  maxHistoryCount: 100,
  maxLogCount: 1000,
  previewScrollAmount: 40,
  progressTaskLogInterval: 3000,
  // Mac のリソースフォークと AppleDouble 形式のメタデータを除外する。
  virtualDirExcludePattern: '^(?:__MACOSX/|\\._.+)',
};

const associations: AssociationsConfig = [
  // { kind: 'mime', pattern: /^text\//, app: 'Visual Studio Code' },
  // { kind: 'path', pattern: /\.json$/, app: 'Visual Studio Code' },
  // (mime, path) => {
  //   if (mime === 'application/toml') {
  //     return 'Visual Studio Code';
  //   }
  // },
];

const config: Config = {
  commands,
  shortcuts,
  messages,
  settings,
  associations,
};

export { config };
