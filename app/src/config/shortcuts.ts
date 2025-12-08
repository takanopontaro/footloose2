import type { ShortcutsConfig } from '@modules/App/types';

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
        cmd: 'BookmarkCurrentDir',
        modes: ['!virtual-dir'],
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
        modes: ['!virtual-dir'],
      },
    ],
    'shift+d': [
      {
        cmd: 'RemoveEntries',
        modes: ['!virtual-dir'],
      },
    ],
    'shift+r': [
      {
        cmd: 'RenameEntry',
        modes: ['!virtual-dir'],
      },
    ],
    'shift+k': [
      {
        cmd: 'CreateDir',
        modes: ['!virtual-dir'],
      },
    ],
    'shift+t': [
      {
        cmd: 'CreateFile',
        modes: ['!virtual-dir'],
      },
    ],
    'shift+o': [
      {
        cmd: 'OpenWith',
        modes: ['!virtual-dir'],
      },
    ],
    'shift+z': [
      {
        cmd: 'ZipEntries',
        modes: ['!virtual-dir'],
      },
    ],
    'shift+u': [
      {
        cmd: 'UnzipArchives',
        modes: ['!virtual-dir'],
      },
    ],
    'shift+ctrl+z': [
      {
        cmd: 'TarEntries',
        modes: ['!virtual-dir'],
      },
    ],
    'shift+ctrl+u': [
      {
        cmd: 'UntarArchives',
        modes: ['!virtual-dir'],
      },
    ],
    'shift+ctrl+meta+z': [
      {
        cmd: 'TgzEntries',
        modes: ['!virtual-dir'],
      },
    ],
    'shift+ctrl+meta+u': [
      {
        cmd: 'UntgzArchives',
        modes: ['!virtual-dir'],
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
        cmd: 'ExecutePrimaryActionListModal',
      },
    ],
    'esc': [
      {
        cmd: 'ExecuteCancelActionListModal',
      },
    ],
    'backspace': [
      {
        cmd: 'ExecuteSecondaryActionListModal',
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
        cmd: 'ExecuteActionPromptModal',
        tags: ['PromptModal:input', 'PromptModal:confirm'],
      },
      {
        cmd: 'ExecuteCancelActionPromptModal',
        tags: ['PromptModal:cancel'],
      },
    ],
    'esc': [
      {
        cmd: 'ExecuteCancelActionPromptModal',
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
        cmd: 'ExecuteActionConfirmModal',
        tags: ['ConfirmModal:confirm'],
      },
      {
        cmd: 'ExecuteCancelActionConfirmModal',
        tags: ['ConfirmModal:cancel'],
      },
    ],
    'esc': [
      {
        cmd: 'ExecuteCancelActionConfirmModal',
      },
    ],
  },
};

export { shortcuts };
