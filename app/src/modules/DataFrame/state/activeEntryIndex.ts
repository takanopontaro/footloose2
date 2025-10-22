import { atom } from 'jotai';
import { RESET, atomFamily } from 'jotai/utils';
import { $activeEntryName, $filteredEntries } from '@modules/DataFrame/state';

import type { SetStateAction } from 'jotai';
import type { Frame } from '@modules/App/types';

/**
 * カレント行のインデックス。
 */
export const $activeEntryIndex = atomFamily((frame: Frame) =>
  atom(
    (get) => {
      const entries = get($filteredEntries(frame));
      const name = get($activeEntryName(frame));
      return entries.findIndex((e) => e.name === name);
    },
    (get, set, newVal: SetStateAction<number> | typeof RESET) => {
      const curVal = get($activeEntryIndex(frame));
      if (typeof newVal === 'function') {
        newVal = newVal(curVal);
      }
      if (newVal === curVal) {
        return;
      }
      if (newVal === RESET) {
        set($activeEntryName(frame), RESET);
        return;
      }
      const entries = get($filteredEntries(frame));
      if (newVal < 0 || newVal >= entries.length) {
        return;
      }
      set($activeEntryName(frame), entries[newVal].name);
    },
  ),
);
