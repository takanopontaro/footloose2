import { atom } from 'jotai';
import { RESET, atomFamily, atomWithReset } from 'jotai/utils';
import { readState, writeState } from '@libs/utils';
import { $modes } from '@modules/App/state';
import {
  $filteredEntries,
  $gridColumnCount,
  $maxVisibleRowCount,
  $firstVisibleEntryIndex,
  $selectedEntryNames,
  $activeEntryIndex,
} from '@modules/DataFrame/state';

import type { SetStateAction } from 'jotai';
import type { Frame } from '@modules/App/types';

/**
 * エントリ一覧の filter-out 状況に応じて、表示領域内の開始エントリを更新する。
 *
 * @param frame - 対象フレーム
 */
function updateFirstVisibleEntryIndex(frame: Frame): void {
  const activeEntryIndex = readState($activeEntryIndex(frame));
  const gridColumnCount = readState($gridColumnCount(frame));
  const maxRowCount = readState($maxVisibleRowCount(frame));

  // カレントエントリが filter-out されている、または
  // スクロール無しで全エントリを表示できる場合。
  if (
    activeEntryIndex === -1 ||
    activeEntryIndex < maxRowCount * gridColumnCount
  ) {
    writeState($firstVisibleEntryIndex(frame), 0);
    return;
  }

  // ------------------------------------
  // $firstVisibleEntryIndex を更新する。
  // カーソル (カレントエントリ) が表示領域内に来るようにする。

  // 表示領域内の全エントリの半分に相当するエントリ数。
  const halfEntryCount = Math.ceil(maxRowCount / 2) * gridColumnCount;

  // カーソルが表示領域の中央あたりに来るよう、開始エントリを調整する。
  let firstEntryIndex = activeEntryIndex - halfEntryCount;

  // グリッドがズレないように、列数の倍数が先頭インデックスになるよう調整する。
  firstEntryIndex = firstEntryIndex - (firstEntryIndex % gridColumnCount);
  writeState($firstVisibleEntryIndex(frame), firstEntryIndex);
}

const filterQueryAtom = atomFamily((_frame: Frame) => atomWithReset(''));

/**
 * EntryFilter の中身。
 * この値を正規表現パターンとして、エントリ一覧が filter-out される。
 */
export const $filterQuery = atomFamily((frame: Frame) =>
  atom(
    (get) => get(filterQueryAtom(frame)),
    (get, set, newVal: SetStateAction<string> | typeof RESET) => {
      const curVal = get(filterQueryAtom(frame));
      if (typeof newVal === 'function') {
        newVal = newVal(curVal);
      }
      if (newVal === curVal) {
        return;
      }
      if (newVal === RESET || newVal === '') {
        set(filterQueryAtom(frame), RESET);
        set($modes(frame), (prev) => prev.filter((m) => m !== 'filter'));
        updateFirstVisibleEntryIndex(frame);
        return;
      }

      set(filterQueryAtom(frame), newVal);
      set($modes(frame), (prev) => [...prev, 'filter']);

      if (newVal.trim() === '') {
        return;
      }

      // ------------------------------------
      // エントリ一覧が filter-out されるため、
      // $firstVisibleEntryIndex や $selectedEntryNames を更新する。
      // できれば $filteredEntries 内で行いたいところだが、
      // read-only atom であり、setter が無いため、ここで行う。
      // (getter 内で atom の更新をしたくない)

      // ここで得られるエントリ一覧にはすでに最新のフィルタが反映されている。
      const entries = get($filteredEntries(frame));

      updateFirstVisibleEntryIndex(frame);

      // filter-out されたエントリを非選択状態にする。
      const entryNames = new Set(entries.map((e) => e.name));
      set($selectedEntryNames(frame), (prev) =>
        prev.filter((n) => entryNames.has(n)),
      );
    },
  ),
);
