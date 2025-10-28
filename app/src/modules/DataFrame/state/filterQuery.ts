import { atom } from 'jotai';
import { RESET, atomFamily, atomWithReset } from 'jotai/utils';
import { readState, writeState } from '@libs/utils';
import { $modes } from '@modules/App/state';
import {
  $activeEntryName,
  $filteredEntries,
  $gridColumnCount,
  $maxVisibleRowCount,
  $firstVisibleEntryIndex,
  $selectedEntryNames,
} from '@modules/DataFrame/state';

import type { SetStateAction } from 'jotai';
import type { Frame } from '@modules/App/types';
import type { Entry } from '@modules/DataFrame/types';

/**
 * エントリ一覧の filter-out 状況に応じて、表示領域内の開始エントリを更新する。
 *
 * @param entries - エントリ一覧
 * @param frame - 対象フレーム
 */
function updateFirstVisibleEntryIndex(entries: Entry[], frame: Frame): void {
  const activeEntryName = readState($activeEntryName(frame));
  const gridColumnCount = readState($gridColumnCount(frame));
  const maxRowCount = readState($maxVisibleRowCount(frame));

  // $activeEntryIndex を使いたいところだが、この時点ではまだ使えない。
  // 引数の entries には $filterQuery が反映されているが、
  // $filteredEntries にはまだ未反映なためである。
  // $activeEntryIndex は $filteredEntries を参照しているため、
  // この時点ではまだ正確なインデックスを得られない。
  // よって findIndex する必要がある。
  const curIndex = entries.findIndex((e) => e.name === activeEntryName);

  // カレントエントリが filter-out されている、または
  // スクロール無しで全エントリを表示できる場合。
  if (curIndex === -1 || curIndex < maxRowCount * gridColumnCount) {
    writeState($firstVisibleEntryIndex(frame), 0);
    return;
  }

  // ------------------------------------
  // $firstVisibleEntryIndex を更新する。
  // カーソル (カレントエントリ) が表示領域内に来るようにする。

  // 表示領域内の全エントリの半分に相当するエントリ数。
  const halfEntryCount = Math.ceil(maxRowCount / 2) * gridColumnCount;

  // カーソルが表示領域の中央あたりに来るよう、開始エントリを調整する。
  let firstEntryIndex = curIndex - halfEntryCount;

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
        const entries = get($filteredEntries(frame));
        updateFirstVisibleEntryIndex(entries, frame);
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

      // パターン入力中は容易に不完全な正規表現になり得るため、
      // try-catch でしっかりガードする。
      try {
        const re = new RegExp(newVal, 'i');
        let entries = get($filteredEntries(frame));
        entries = entries.filter((e) => re.test(e.name));
        updateFirstVisibleEntryIndex(entries, frame);

        // filter-out される (だろう) エントリを非選択にする。
        // (filter-out 自体は $filteredEntries で行われる)
        const entryNames = new Set(entries.map((e) => e.name));
        set($selectedEntryNames(frame), (prev) =>
          prev.filter((n) => entryNames.has(n)),
        );
      } catch (_e) {
        // 握りつぶす ✊💥
      }
    },
  ),
);
