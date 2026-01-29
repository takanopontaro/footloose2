import { atom } from 'jotai';
import { atomFamily, RESET } from 'jotai/utils';
import { shallowEqualArray } from '@libs/utils';
import {
  $filteredEntries,
  $selectedEntryNames,
} from '@modules/DataFrame/state';

import type { SetStateAction } from 'jotai';
import type { Frame } from '@modules/App/types';

/**
 * 選択されているエントリのインデックス一覧。
 */
export const $selectedEntryIndices = atomFamily((frame: Frame) =>
  atom(
    (get) => {
      const entries = get($filteredEntries(frame));
      const names = get($selectedEntryNames(frame));
      return names.map((n) => entries.findIndex((e) => e.name === n));
    },
    (get, set, newVal: SetStateAction<number[]> | typeof RESET) => {
      const curVal = get($selectedEntryIndices(frame));
      if (typeof newVal === 'function') {
        newVal = newVal(curVal);
      }
      if (newVal === RESET || newVal.length === 0) {
        set($selectedEntryNames(frame), RESET);
        return;
      }

      // `..` は選択できないようにする。
      const indices = [...new Set(newVal)].sort().filter((i) => i !== 0);
      if (shallowEqualArray(indices, curVal)) {
        return;
      }

      const entries = get($filteredEntries(frame));

      // 無効な値があれば、更新せず return する。
      const hasInvalid = indices.some((i) => entries[i] === undefined);
      if (hasInvalid) {
        return;
      }

      const names = indices.map((i) => entries[i].name);
      set($selectedEntryNames(frame), names);
    },
  ),
);
