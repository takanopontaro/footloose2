import { shallowEqualArray } from '@libs/utils';
import { atom } from 'jotai';
import { RESET, atomWithReset } from 'jotai/utils';
import type { Tag } from '@modules/App/types';
import type { SetStateAction } from 'jotai';

const tagsAtom = atomWithReset<Tag[]>([]);

export const $tags = atom(
  (get) => get(tagsAtom),
  (get, set, newVal: SetStateAction<Tag[]> | typeof RESET) => {
    const curVal = get(tagsAtom);
    if (typeof newVal === 'function') {
      newVal = newVal(curVal);
    }
    if (newVal === RESET || newVal.length === 0) {
      set(tagsAtom, RESET);
      return;
    }
    const tags = [...new Set(newVal)].sort();
    if (shallowEqualArray(tags, curVal)) {
      return;
    }
    set(tagsAtom, tags);
  },
);
