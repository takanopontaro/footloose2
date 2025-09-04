import { atom } from 'jotai';
import { RESET, atomFamily } from 'jotai/utils';
import { shallowEqualArray } from '@libs/utils';
import {
  $filteredEntries,
  $selectedEntryNames,
} from '@modules/DataFrame/state';

import type { SetStateAction } from 'jotai';
import type { Frame } from '@modules/App/types';

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
      // 先頭の .. は選択できないようにする。
      const indices = [...new Set(newVal)].sort().filter((i) => i !== 0);
      if (shallowEqualArray(indices, curVal)) {
        return;
      }
      const entries = get($filteredEntries(frame));
      const allExist = indices.every((i) => entries[i] !== undefined);
      if (!allExist) {
        return;
      }
      const names = indices.map((i) => entries[i].name);
      set($selectedEntryNames(frame), names);
    },
  ),
);
