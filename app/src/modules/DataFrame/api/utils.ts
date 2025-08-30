import { get } from '@libs/utils';
import { $activeFrame } from '@modules/App/state';
import {
  $activeEntryName,
  $filteredEntries,
  $selectedEntryNames,
} from '@modules/DataFrame/state';
import type { SymlinkInfo } from '@modules/DataFrame/types';

// 現在行 (name) を取得する。
// EntryFilter により非表示になっている場合は空文字を返す。
function getTargetName(frame = get($activeFrame), allowParent = false): string {
  const curName = get($activeEntryName(frame));
  const entries = get($filteredEntries(frame));
  const names = new Set(entries.map((e) => e.name));
  if (curName === '' || !names.has(curName)) {
    return '';
  }
  if (!allowParent && curName === '..') {
    return '';
  }
  return curName;
}

// 選択行の配列 (name) を取得する。
// 空なら、現在行 (name) を取得する。
// EntryFilter により非表示になっている場合は空文字を返す。
function getTargetNames(frame = get($activeFrame)): string[] {
  const selectedNames = get($selectedEntryNames(frame));
  if (selectedNames.length > 0) {
    return selectedNames;
  }
  const name = getTargetName(frame);
  return name === '' ? [] : [name];
}

function is(name: string, type: string, frame = get($activeFrame)): boolean {
  const entries = get($filteredEntries(frame));
  const entry = entries.find((e) => e.name === name);
  return entry?.perm.startsWith(type) === true;
}

function isDir(name: string, frame = get($activeFrame)): boolean {
  return is(name, 'd', frame);
}

function isFile(name: string, frame = get($activeFrame)): boolean {
  return is(name, '-', frame);
}

function isSymlink(name: string, frame = get($activeFrame)): boolean {
  return is(name, 'l', frame);
}

function getSymlinkInfo(
  name: string,
  frame = get($activeFrame),
): SymlinkInfo | undefined {
  const entries = get($filteredEntries(frame));
  const entry = entries.find((e) => e.name === name);
  if (!entry || !entry.perm.startsWith('l')) {
    return;
  }
  const matches = entry.link.match(/^([dfe]):(.+)$/);
  if (!matches) {
    return;
  }
  return {
    type: matches[1] as SymlinkInfo['type'],
    target: matches[2],
  };
}

export {
  getTargetName,
  getTargetNames,
  isDir,
  isFile,
  isSymlink,
  getSymlinkInfo,
};
