import { readState } from '@libs/utils';
import { $activeFrame } from '@modules/App/state';
import {
  $activeEntryName,
  $filteredEntries,
  $selectedEntryNames,
} from '@modules/DataFrame/state';

import type { SymlinkInfo } from '@modules/DataFrame/types';

/**
 * カレントエントリの name を返す。
 * filter-out されている場合は空文字を返す。
 *
 * @param frame - 対象フレーム
 * @param allowParent - `..` を含むか否か
 *   false の時は `..` がカレントエントリであっても空文字を返す。
 * @return カレントエントリの name または空文字
 */
function getActiveEntryName(
  frame = readState($activeFrame),
  allowParent = false,
): string {
  const name = readState($activeEntryName(frame));
  const entries = readState($filteredEntries(frame));
  const entryNames = new Set(entries.map((e) => e.name));
  if (name === '' || !entryNames.has(name)) {
    return '';
  }
  if (!allowParent && name === '..') {
    return '';
  }
  return name;
}

/**
 * 選択行の name 配列を返す (`..` を含む)。
 * 未選択ならカレントエントリの name を返す。
 * カレントエントリが filter-out されている場合は空文字を返す。
 *
 * @param frame - 対象フレーム
 * @param allowParent - `..` を含むか否か
 *   false の時は `..` がカレントエントリであっても空文字を返す。
 *   選択行が無い場合のみ有効。
 * @return 選択行の name 配列または空配列
 */
function getTargetNames(
  frame = readState($activeFrame),
  allowParent = false,
): string[] {
  const selectedNames = readState($selectedEntryNames(frame));
  if (selectedNames.length > 0) {
    return selectedNames;
  }
  const name = getActiveEntryName(frame, allowParent);
  return name === '' ? [] : [name];
}

/**
 * エントリの種類を照合する。
 */
function is(
  name: string,
  type: string,
  frame = readState($activeFrame),
): boolean {
  const entries = readState($filteredEntries(frame));
  const entry = entries.find((e) => e.name === name);
  return entry?.perm.startsWith(type) === true;
}

/**
 * そのエントリがディレクトリか否かを返す。
 *
 * @param name - エントリの name
 * @param frame - 対象フレーム
 * @return ディレクトリか否か
 */
function isDir(name: string, frame = readState($activeFrame)): boolean {
  return is(name, 'd', frame);
}

/**
 * そのエントリがファイルか否かを返す。
 *
 * @param name - エントリの name
 * @param frame - 対象フレーム
 * @return ファイルか否か
 */
function isFile(name: string, frame = readState($activeFrame)): boolean {
  return is(name, '-', frame);
}

/**
 * そのエントリがシンボリックリンクか否かを返す。
 *
 * @param name - エントリの name
 * @param frame - 対象フレーム
 * @return シンボリックリンクか否か
 */
function isSymlink(name: string, frame = readState($activeFrame)): boolean {
  return is(name, 'l', frame);
}

/**
 * シンボリックリンクの情報を返す。
 *
 * @param name - エントリの name
 * @param frame - 対象フレーム
 * @return SymlinkInfo または null (以下のような場合)
 *   - シンボリックリンクではない。
 *   - 情報取得時にエラーが起きた。
 */
function getSymlinkInfo(
  name: string,
  frame = readState($activeFrame),
): SymlinkInfo | null {
  const entries = readState($filteredEntries(frame));
  const entry = entries.find((e) => e.name === name);
  if (!entry || !isSymlink(name, frame)) {
    return null;
  }
  const matches = entry.link.match(/^([dfe]):(.+)$/);
  if (!matches) {
    return null;
  }
  return {
    type: matches[1] as SymlinkInfo['type'],
    target: matches[2],
  };
}

export {
  getActiveEntryName,
  getTargetNames,
  isDir,
  isFile,
  isSymlink,
  getSymlinkInfo,
};
