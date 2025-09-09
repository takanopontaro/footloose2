import { atom } from 'jotai';
import { RESET, atomFamily, atomWithReset } from 'jotai/utils';
import { readState, writeState } from '@libs/utils';
import { $modes } from '@modules/App/state';
import {
  $activeEntryName,
  $filteredEntries,
  $gridColumnCount,
  $maxRenderedRowCount,
  $renderedEntryStartIndex,
  $selectedEntryNames,
} from '@modules/DataFrame/state';

import type { SetStateAction } from 'jotai';
import type { Frame } from '@modules/App/types';
import type { Entry } from '@modules/DataFrame/types';

const filterQueryAtom = atomFamily((_frame: Frame) => atomWithReset(''));

function updateStartRow(entries: Entry[], frame: Frame): void {
  const curName = readState($activeEntryName(frame));
  const curIndex = entries.findIndex((v) => v.name === curName);
  const colCount = readState($gridColumnCount(frame));
  const maxRowCount = readState($maxRenderedRowCount(frame));
  // スクロール無しで全 entry を表示できる場合
  if (curIndex === -1 || curIndex < maxRowCount * colCount) {
    writeState($renderedEntryStartIndex(frame), 0);
    return;
  }
  const diff = Math.ceil(maxRowCount / 2) * colCount;
  let newRow = curIndex - diff;
  newRow = newRow - (newRow % colCount);
  writeState($renderedEntryStartIndex(frame), newRow);
}

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
        updateStartRow(entries, frame);
        return;
      }
      if (newVal !== '') {
        // パターン入力中の場合を考慮して、
        // 無効な正規表現の場合は catch 句で握りつぶす
        try {
          // フィルターにマッチしない (非表示になる) entry を非選択にする
          // フィルタリング自体は entries の getter で行う
          const re = new RegExp(newVal, 'i');
          let entries = get($filteredEntries(frame));
          entries = entries.filter((v) => re.test(v.name));
          updateStartRow(entries, frame);
          const names = new Set(entries.map((e) => e.name));
          set($selectedEntryNames(frame), (prev) =>
            prev.filter((n) => names.has(n)),
          );
        } catch (_e) {
          // 握りつぶす ✊💥
        }
      }
      set(filterQueryAtom(frame), newVal);
      set($modes(frame), (prev) => [...prev, 'filter']);
    },
  ),
);
