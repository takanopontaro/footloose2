import { readState } from '@libs/utils';
import { $activeFrame, $modes } from '@modules/App/state';
import { getOtherFrame } from '@modules/DataFrame/libs';
import { EntryModel } from '@modules/DataFrame/models';
import {
  $activeEntryName,
  $currentDir,
  $filteredEntries,
  $selectedEntryNames,
} from '@modules/DataFrame/state';

import type { Frame } from '@modules/App/types';
import type { CurrentDir, SymlinkInfo } from '@modules/DataFrame/types';

/**
 * 指定したフレームの CurrentDir オブジェクトを取得する。
 *
 * @param frame - 対象フレーム
 * @returns CurrentDir オブジェクト
 */
function getCurrentDir(frame: Frame): CurrentDir {
  const curDir = readState($currentDir(frame));
  const modes = readState($modes(frame));
  return { isVirtual: modes.includes('virtual-dir'), path: curDir };
}

/**
 * ソースディレクトリの情報を取得する。
 *
 * @returns CurrentDir オブジェクト
 */
function getSourceDir(): CurrentDir {
  const frame = readState($activeFrame);
  return getCurrentDir(frame);
}

/**
 * 出力先ディレクトリの情報を取得する。
 *
 * @returns CurrentDir オブジェクト
 */
function getDestinationDir(): CurrentDir {
  const frame = readState($activeFrame);
  return getCurrentDir(getOtherFrame(frame));
}

/**
 * カレントエントリの name を返す。
 * filter-out されている場合は空文字を返す。
 *
 * @param frame - 対象フレーム
 * @param allowParent - `..` を含むか否か
 *   false の時は `..` がカレントエントリであっても空文字を返す。
 * @returns カレントエントリの name または空文字
 */
function getActiveEntryName(
  frame = readState($activeFrame),
  allowParent = false,
): string {
  const name = readState($activeEntryName(frame));
  const entries = readState($filteredEntries(frame));
  if (name === '' || !entries.some((e) => e.name === name)) {
    return '';
  }
  if (!allowParent && name === '..') {
    return '';
  }
  return name;
}

/**
 * カレントエントリを返す。
 * filter-out されている場合は null を返す。
 *
 * @param frame - 対象フレーム
 * @param allowParent - `..` を含むか否か
 *   false の時は `..` がカレントエントリであっても null を返す。
 * @returns カレントエントリまたは null
 */
function getActiveEntry(
  frame = readState($activeFrame),
  allowParent = false,
): EntryModel | null {
  const name = getActiveEntryName(frame, allowParent);
  if (!name) {
    return null;
  }
  const entries = readState($filteredEntries(frame));
  const entry = entries.find((e) => e.name === name);
  if (!entry) {
    throw new Error('unreachable');
  }
  const curDir = readState($currentDir(frame));
  return new EntryModel(entry, curDir);
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
 * @returns 選択行の name 配列または空配列
 */
function getTargetEntryNames(
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
 * 選択行のエントリ配列を返す (`..` を含む)。
 * 未選択ならカレントエントリを返す。
 * カレントエントリが filter-out されている場合は空配列を返す。
 *
 * @param frame - 対象フレーム
 * @param allowParent - `..` を含むか否か
 *   false の時は `..` がカレントエントリであっても空配列を返す。
 *   選択行が無い場合のみ有効。
 * @returns 選択行のエントリ配列または空配列
 */
function getTargetEntries(
  frame = readState($activeFrame),
  allowParent = false,
): EntryModel[] {
  const targetNames = getTargetEntryNames(frame, allowParent);
  if (targetNames.length === 0) {
    return [];
  }
  const names = new Set(targetNames); // 高速化のため Set に変換する。
  const curDir = readState($currentDir(frame));
  const entries = readState($filteredEntries(frame));
  return entries
    .filter((e) => names.has(e.name))
    .map((entry) => new EntryModel(entry, curDir));
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
 * @returns ディレクトリか否か
 */
function isDir(name: string, frame = readState($activeFrame)): boolean {
  return is(name, 'd', frame);
}

/**
 * そのエントリがファイルか否かを返す。
 *
 * @param name - エントリの name
 * @param frame - 対象フレーム
 * @returns ファイルか否か
 */
function isFile(name: string, frame = readState($activeFrame)): boolean {
  return is(name, '-', frame);
}

/**
 * そのエントリがシンボリックリンクか否かを返す。
 *
 * @param name - エントリの name
 * @param frame - 対象フレーム
 * @returns シンボリックリンクか否か
 */
function isSymlink(name: string, frame = readState($activeFrame)): boolean {
  return is(name, 'l', frame);
}

/**
 * シンボリックリンクの情報を返す。
 *
 * @param name - エントリの name
 * @param frame - 対象フレーム
 * @returns SymlinkInfo または null (以下のような場合)
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
  getCurrentDir,
  getSourceDir,
  getDestinationDir,
  getActiveEntryName,
  getActiveEntry,
  getTargetEntryNames,
  getTargetEntries,
  isDir,
  isFile,
  isSymlink,
  getSymlinkInfo,
};
