import { RESET } from 'jotai/utils';
import { readState, writeState } from '@libs/utils';
import { $activeFrame } from '@modules/App/state';
import { getActiveEntryName } from '@modules/DataFrame/api';
import {
  calcGridIndex,
  cycleGridIndex,
  escapeRegExp,
} from '@modules/DataFrame/libs';
import {
  $activeEntryIndex,
  $activeEntryName,
  $filteredEntries,
  $gridColumnCount,
  $maxVisibleRowCount,
  $selectedEntryIndices,
  $selectedEntryNames,
} from '@modules/DataFrame/state';

import type { Direction, Frame } from '@modules/App/types';
import type { CursorDirection } from '@modules/DataFrame/types';

/**
 * グリッド上の移動量を、配列のインデックスとしての移動量に変換して返す。
 * 例えば 4 列グリッドにおいて、下に 1 移動する場合、
 * 配列インデックスとしての移動量は 4 になる。
 *
 * @param step - グリッドにおける移動量
 *   上に 1、右に 3 といった上下左右に対する移動量。
 * @param direction - 移動方向
 * @param frame - 対象フレーム
 * @returns インデックスとしての移動量
 */
function calcDelta(
  step: number,
  direction: CursorDirection,
  frame: Frame,
): number {
  const gridColumnCount = readState($gridColumnCount(frame));
  switch (direction) {
    case 'up':
      return gridColumnCount * -step;
    case 'right':
      return step;
    case 'down':
      return gridColumnCount * step;
    case 'left':
      return -step;
  }
}

/**
 * カーソルを移動する。
 * リスト、グリッド両対応。
 *
 * @param step - 移動量
 * @param direction - 移動方向
 * @param loop - ループするか否か
 * @param frame - 対象フレーム
 */
function moveCursor(
  step: number,
  direction: CursorDirection,
  loop = true,
  frame = readState($activeFrame),
): void {
  const curIndex = readState($activeEntryIndex(frame));
  if (curIndex === -1) {
    writeState($activeEntryIndex(frame), 0);
    return;
  }
  const delta = calcDelta(step, direction, frame);
  const newIndex = loop
    ? cycleGridIndex(frame, delta, direction)
    : calcGridIndex(frame, delta, direction);
  writeState($activeEntryIndex(frame), newIndex);
}

/**
 * カーソルをページ単位で移動する。
 * リスト、グリッド両対応。
 *
 * @param direction - 移動方向
 * @param frame - 対象フレーム
 */
function moveCursorByPage(
  direction: Direction,
  frame = readState($activeFrame),
): void {
  const curIndex = readState($activeEntryIndex(frame));
  if (curIndex === -1) {
    writeState($activeEntryIndex(frame), 0);
    return;
  }
  const gridColumnCount = readState($gridColumnCount(frame));
  const maxRowCount = readState($maxVisibleRowCount(frame));
  const itemsPerPage = maxRowCount * gridColumnCount;
  const delta = (itemsPerPage - gridColumnCount) * direction;
  const dir = direction === 1 ? 'down' : 'up';
  const newIndex = calcGridIndex(frame, delta, dir);
  writeState($activeEntryIndex(frame), newIndex);
}

/**
 * カーソルを端まで移動する。
 * リスト、グリッド両対応。
 *
 * @param direction - 移動方向
 * @param frame - 対象フレーム
 */
function moveCursorToEdge(
  direction: Direction,
  frame = readState($activeFrame),
): void {
  const entries = readState($filteredEntries(frame));
  const newIndex = direction === 1 ? entries.length - 1 : 0;
  writeState($activeEntryIndex(frame), newIndex);
}

/**
 * 押下したキーで名前が始まるエントリにカーソルを移動する。
 * 例えば、a1, a2, b1, b2, b3, c1, c2 というエントリがあるとする。
 * ここで b を押下すると b1 が選択される。
 * 続けて b を押下すると b2 -> b3 -> b1 とループして選択されていく。
 * リスト、グリッド両対応。
 *
 * @param key - 押下したキー
 * @param frame - 対象フレーム
 */
function moveCursorByStartingLetter(
  key: string,
  frame = readState($activeFrame),
): void {
  const entries = readState($filteredEntries(frame));
  const curIndex = readState($activeEntryIndex(frame));

  // カレントエントリを基準にエントリ一覧を二分割し前後を入れ替える。
  // こうすることで、同じキー押下で順繰りにループ選択できる。
  const firstPart = entries.slice(0, curIndex + 1);
  const secondPart = entries.slice(curIndex + 1);
  const newEntries = secondPart.concat(firstPart);

  // 正規表現の特殊文字をエスケープして通常文字として扱えるようにする。
  const k = escapeRegExp(key);

  const entry = newEntries.find((e) => new RegExp(`^${k}`, 'i').test(e.name));
  if (entry) {
    writeState($activeEntryName(frame), entry.name);
  }
}

/**
 * エントリの選択状態を制御する。
 * name を基準とする。
 *
 * @param name - エントリの name
 * @param select - 選択するか否か (undefined の場合はトグル)
 * @param frame - 対象フレーム
 */
function toggleRowSelectionByName(
  name: string,
  select?: boolean,
  frame = readState($activeFrame),
): void {
  const selectedNames = readState($selectedEntryNames(frame));
  if (select === undefined) {
    select = !selectedNames.includes(name);
  }
  writeState(
    $selectedEntryNames(frame),
    select
      ? (prev) => [...prev, name]
      : (prev) => prev.filter((n) => n !== name),
  );
}

/**
 * エントリの選択状態を制御する。
 * インデックスを基準とする。
 *
 * @param index - エントリのインデックス
 * @param select - 選択するか否か (undefined の場合はトグル)
 * @param frame - 対象フレーム
 */
function toggleRowSelectionByIndex(
  index: number,
  select?: boolean,
  frame = readState($activeFrame),
): void {
  const entries = readState($filteredEntries(frame));
  toggleRowSelectionByName(entries[index].name, select, frame);
}

/**
 * カレントエントリの選択状態を制御する。
 *
 * @param select - 選択するか否か (undefined の場合はトグル)
 * @param frame - 対象フレーム
 */
function toggleRowSelection(
  select?: boolean,
  frame = readState($activeFrame),
): void {
  const name = getActiveEntryName(frame);
  if (name) {
    toggleRowSelectionByName(name, select, frame);
  }
}

/**
 * すべてのエントリを選択する。
 *
 * @param frame - 対象フレーム
 */
function selectAllRows(frame = readState($activeFrame)): void {
  const entries = readState($filteredEntries(frame));
  const allIndices = Array.from({ length: entries.length }, (_, i) => i);
  writeState($selectedEntryIndices(frame), allIndices);
}

/**
 * すべてのエントリの選択を解除する。
 *
 * @param frame - 対象フレーム
 */
function deselectAllRows(frame = readState($activeFrame)): void {
  writeState($selectedEntryNames(frame), RESET);
}

/**
 * すべてのエントリの選択状態を反転する。
 *
 * @param frame - 対象フレーム
 */
function invertAllRowSelections(frame = readState($activeFrame)): void {
  const entries = readState($filteredEntries(frame));
  const allIndices = Array.from({ length: entries.length }, (_v, i) => i);
  const selectedIndices = readState($selectedEntryIndices(frame));
  const indices = allIndices.filter((i) => !selectedIndices.includes(i));
  writeState($selectedEntryIndices(frame), indices);
}

export {
  moveCursor,
  moveCursorByPage,
  moveCursorToEdge,
  moveCursorByStartingLetter,
  toggleRowSelectionByName,
  toggleRowSelectionByIndex,
  toggleRowSelection,
  selectAllRows,
  deselectAllRows,
  invertAllRowSelections,
};
