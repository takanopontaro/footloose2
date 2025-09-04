import { atom } from 'jotai';
import { RESET, atomFamily, atomWithReset } from 'jotai/utils';
import { shallowEqualArray } from '@libs/utils';

import type { SetStateAction } from 'jotai';
import type { Frame, Mode } from '@modules/App/types';

const modesAtom = atomFamily((_frame: Frame) => atomWithReset<Mode[]>([]));

export const $modes = atomFamily((frame: Frame) =>
  atom(
    (get) => get(modesAtom(frame)),
    (get, set, newVal: SetStateAction<Mode[]> | typeof RESET) => {
      const curVal = get(modesAtom(frame));
      if (typeof newVal === 'function') {
        newVal = newVal(curVal);
      }
      if (newVal === RESET || newVal.length === 0) {
        set(modesAtom(frame), RESET);
        return;
      }
      const modes = [...new Set(newVal)].sort();
      if (shallowEqualArray(modes, curVal)) {
        return;
      }
      set(modesAtom(frame), modes);
    },
  ),
);
