import type { ShortcutsConfig } from '@modules/App/types';

const shortcuts: ShortcutsConfig = {
  DataFrame: {
    'ctrl+f': [
      {
        cmd: 'FocusEntryFilter',
      },
    ],
    'ctrl+;': [
      {
        cmd: 'CycleMatchMode',
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
    'shift+pageup, home': [
      {
        cmd: 'MoveCursorToEdge',
        args: { direction: -1 },
      },
    ],
    'pagedown': [
      {
        cmd: 'MoveCursorByPage',
        args: { direction: 1 },
      },
    ],
    'shift+pagedown, end': [
      {
        cmd: 'MoveCursorToEdge',
        args: { direction: 1 },
      },
    ],
    '0, 1, 2, 3, 4, 5, 6, 7, 8, 9, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s, t, u, v, w, x, y, z, ., ~, `, !, @, #, $, %, ^, &, *, (, ), _, -, +, =, {, [, }, ], |, \\\\, :, ;, ", \', <, \\,, >, ., ?, /':
      [
        {
          cmd: 'MoveCursorByStartingLetter',
        },
      ],
    'space': [
      {
        cmd: 'ToggleRowSelection',
      },
      {
        cmd: 'MoveCursor',
        args: { step: 1, direction: 'down', loop: false },
        modes: ['!gallery'],
      },
    ],
    'shift+space': [
      {
        cmd: 'ToggleRowSelection',
      },
      {
        cmd: 'MoveCursor',
        args: { step: 1, direction: 'up', loop: false },
        modes: ['!gallery'],
      },
    ],
    'ctrl+w': [
      {
        cmd: 'SelectRangeUpToNearestSelectedRow',
      },
    ],
    'shift+w': [
      {
        cmd: 'SelectRangeDownToNearestSelectedRow',
      },
    ],
    'ctrl+a': [
      {
        cmd: 'SelectAllRows',
      },
    ],
    'shift+a': [
      {
        cmd: 'DeselectAllRows',
      },
    ],
    'shift+ctrl+a': [
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
    'ctrl+s': [
      {
        cmd: 'SyncDestDirPathWithSrcDirPath',
      },
    ],
    'shift+s': [
      {
        cmd: 'SyncSrcDirPathWithDestDirPath',
      },
    ],
    'shift+ctrl+s': [
      {
        cmd: 'SwapDirPaths',
      },
    ],
    'ctrl+j': [
      {
        cmd: 'GoToDir',
      },
    ],
    'ctrl+h': [
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
    'ctrl+b': [
      {
        cmd: 'ShowAllBookmarks',
      },
    ],
    'shift+b': [
      {
        cmd: 'BookmarkCurrentDir',
        modes: ['!virtual-dir'],
      },
    ],
    'ctrl+=': [
      {
        cmd: 'CopySrcPathsToClipboard',
      },
    ],
    'shift+=': [
      {
        cmd: 'CopySrcDirPathToClipboard',
      },
    ],
    'ctrl+c': [
      {
        cmd: 'CopyEntries',
        modes: ['!virtual-dir'],
      },
      {
        cmd: 'ExtractSelectedEntries',
        modes: ['virtual-dir'],
      },
    ],
    'ctrl+m': [
      {
        cmd: 'MoveEntries',
        modes: ['!virtual-dir'],
      },
    ],
    'ctrl+d': [
      {
        cmd: 'RemoveEntries',
        modes: ['!virtual-dir'],
      },
    ],
    'ctrl+r': [
      {
        cmd: 'RenameEntry',
        modes: ['!virtual-dir'],
      },
    ],
    'ctrl+k': [
      {
        cmd: 'CreateDir',
        modes: ['!virtual-dir'],
      },
    ],
    'ctrl+t': [
      {
        cmd: 'CreateFile',
        modes: ['!virtual-dir'],
      },
    ],
    'ctrl+o': [
      {
        cmd: 'OpenWith',
        modes: ['!virtual-dir'],
      },
    ],
    'shift+o': [
      {
        cmd: 'OpenCurrentDir',
        modes: ['!virtual-dir'],
      },
    ],
    'ctrl+z': [
      {
        cmd: 'ZipEntries',
        modes: ['!virtual-dir'],
      },
    ],
    'ctrl+u': [
      {
        cmd: 'Unarchive',
        modes: ['!virtual-dir'],
      },
    ],
    'ctrl+0': [
      {
        cmd: 'ClearSort',
      },
    ],
    'ctrl+1': [
      {
        cmd: 'CycleSortOrder',
        args: { field: 'perm' },
      },
    ],
    'ctrl+2': [
      {
        cmd: 'CycleSortOrder',
        args: { field: 'name' },
      },
    ],
    'ctrl+3': [
      {
        cmd: 'CycleSortOrder',
        args: { field: 'size' },
      },
    ],
    'ctrl+4': [
      {
        cmd: 'CycleSortOrder',
        args: { field: 'time' },
      },
    ],
    'ctrl+`': [
      {
        cmd: 'CycleDirPosition',
      },
    ],
    'ctrl+g': [
      {
        cmd: 'ToggleGalleryMode',
      },
    ],
    'ctrl+p': [
      {
        cmd: 'TogglePreviewArea',
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
    'shift+meta+pageup, meta+home': [
      {
        cmd: 'ScrollToEdgePreviewArea',
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
    'shift+meta+pagedown, meta+end': [
      {
        cmd: 'ScrollToEdgePreviewArea',
        args: { direction: 1 },
        modes: ['preview'],
      },
    ],
    'esc': [
      {
        cmd: 'ClearEntryFilter',
      },
    ],
  },
  EntryFilter: {
    'up, down, enter': [
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
    'tab, shift+tab': [
      {
        cmd: 'None',
      },
    ],
    'ctrl+;': [
      {
        cmd: 'CycleMatchMode',
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
    'shift+pageup, home': [
      {
        cmd: 'ScrollToEdgeLogFrame',
        args: { direction: -1 },
      },
    ],
    'pagedown': [
      {
        cmd: 'ScrollByPageLogFrame',
        args: { direction: 1 },
      },
    ],
    'shift+pagedown, end': [
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
        args: { step: 1, direction: -1, loop: true },
      },
    ],
    'shift+up': [
      {
        cmd: 'MoveCursorListModal',
        args: { step: 5, direction: -1, loop: true },
      },
    ],
    'down': [
      {
        cmd: 'MoveCursorListModal',
        args: { step: 1, direction: 1, loop: true },
      },
    ],
    'shift+down': [
      {
        cmd: 'MoveCursorListModal',
        args: { step: 5, direction: 1, loop: true },
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
    'ctrl+f': [
      {
        cmd: 'FocusListModalEntryFilter',
      },
    ],
    'ctrl+;': [
      {
        cmd: 'CycleMatchModeListModal',
      },
    ],
    'tab, shift+tab': [
      {
        cmd: 'None',
      },
    ],
  },
  ListModalEntryFilter: {
    'up, down, enter': [
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
    'tab, shift+tab': [
      {
        cmd: 'None',
      },
    ],
    'ctrl+;': [
      {
        cmd: 'CycleMatchModeListModal',
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
