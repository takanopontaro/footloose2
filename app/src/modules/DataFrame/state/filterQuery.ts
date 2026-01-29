import { atom } from 'jotai';
import { RESET, atomFamily, atomWithReset } from 'jotai/utils';
import { readState, writeState } from '@libs/utils';
import {
  $modes,
  $filteredEntries,
  $gridColumnCount,
  $maxVisibleRowCount,
  $firstVisibleEntryIndex,
  $selectedEntryNames,
  $activeEntryIndex,
  $renderedEntries,
  $activeEntryName,
} from '@modules/DataFrame/state';

import type { SetStateAction } from 'jotai';
import type { Frame } from '@modules/App/types';

/**
 * 表示されているエントリ一覧におけるカレントエントリのインデックスを返す。
 * 表示領域に 10 個のエントリが表示されているとして、
 * その 5 番目がカレントの場合、4 を返す。
 * ちなみに $activeEntryIndex は全エントリに対するインデックスである。
 *
 * @param frame - 対象フレーム
 * @returns カレントエントリのインデックス
 */
function getRenderedEntryIndex(frame: Frame): number {
  const activeEntryName = readState($activeEntryName(frame));
  const renderedEntries = readState($renderedEntries(frame));
  return renderedEntries.findIndex((e) => e.name === activeEntryName);
}

/**
 * エントリ一覧の filter-out 状況に応じて、表示領域内の開始エントリを更新する。
 *
 * @param renderedEntryIndex - カレントエントリのインデックス
 *   全エントリではなく表示されているエントリ一覧に対しての。
 * @param frame - 対象フレーム
 */
function updateFirstVisibleEntryIndex(
  renderedEntryIndex: number,
  frame: Frame,
): void {
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
  // カレントの位置はデータが更新される前のそれと同じにした方が目に優しい。

  // activeEntryIndex は全エントリ (最新データ) の中での位置を表している。
  // そこから renderedEntryIndex を引けば、
  // 以前と同じカーソル位置になるよう調整された開始インデックスを算出できる。
  const newIndex = activeEntryIndex - renderedEntryIndex;
  writeState($firstVisibleEntryIndex(frame), newIndex);
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

      // filter-out 後のカレント位置調整のため、
      // 現在のカレントエントリのインデックスを取得しておく。
      // filterQueryAtom を更新すると数珠つなぎに atom が更新されていくため、
      // 前もって取得しておく必要がある。
      const renderedEntryIndex = getRenderedEntryIndex(frame);

      if (newVal === RESET || newVal === '') {
        set(filterQueryAtom(frame), RESET);
        set($modes(frame), (prev) => prev.filter((m) => m !== 'filter'));
        updateFirstVisibleEntryIndex(renderedEntryIndex, frame);
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

      updateFirstVisibleEntryIndex(renderedEntryIndex, frame);

      // filter-out されたエントリを非選択状態にする。
      const entryNames = new Set(entries.map((e) => e.name));
      set($selectedEntryNames(frame), (prev) =>
        prev.filter((n) => entryNames.has(n)),
      );
    },
  ),
);
