import { atom } from 'jotai';
import { RESET, atomFamily, atomWithReset } from 'jotai/utils';
import { shallowEqualArray } from '@libs/utils';
import { $filteredEntries } from '@modules/DataFrame/state';

import type { SetStateAction } from 'jotai';
import type { Frame } from '@modules/App/types';

const selectedEntryNamesAtom = atomFamily((_frame: Frame) =>
  atomWithReset<string[]>([]),
);

/**
 * 選択されているエントリの名前一覧。
 */
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

      // `..` は選択できないようにし、空文字も弾く。
      const names = [...new Set(newVal)]
        .sort()
        .filter((n) => n !== '' && n !== '..');

      if (shallowEqualArray(names, curVal)) {
        return;
      }

      const entries = get($filteredEntries(frame));
      const entryNames = new Set(entries.map((e) => e.name));

      // 無効な値があれば、更新せず return する。
      const hasInvalid = names.some((n) => !entryNames.has(n));
      if (hasInvalid) {
        return;
      }

      set(selectedEntryNamesAtom(frame), names);
    },
  ),
);
