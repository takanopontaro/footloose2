import { atom } from 'jotai';
import { RESET, atomFamily, atomWithReset } from 'jotai/utils';
import { shallowEqualArray } from '@libs/utils';

import type { SetStateAction } from 'jotai';
import type { Frame } from '@modules/App/types';

const selectedEntryNamesAtom = atomFamily((_frame: Frame) =>
  atomWithReset<string[]>([]),
);

export const $selectedEntryNames = atomFamily((frame: Frame) =>
  atom(
    (get) => get(selectedEntryNamesAtom(frame)),
    (get, set, newVal: SetStateAction<string[]> | typeof RESET) => {
      const curVal = get(selectedEntryNamesAtom(frame));
      if (typeof newVal === 'function') {
        newVal = newVal(curVal);
      }
      if (newVal === RESET || newVal.length === 0) {
        set(selectedEntryNamesAtom(frame), RESET);
        return;
      }
      // 先頭の .. は選択できないようにする。
      const names = [...new Set(newVal)].sort().filter((n) => n !== '..');
      if (shallowEqualArray(names, curVal)) {
        return;
      }
      set(selectedEntryNamesAtom(frame), names);
    },
  ),
);
