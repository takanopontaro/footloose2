import { atom } from 'jotai';
import { RESET, atomFamily, atomWithReset } from 'jotai/utils';
import { $filteredEntries } from '@modules/DataFrame/state';

import type { SetStateAction } from 'jotai';
import type { Frame } from '@modules/App/types';

const selectedEntryNamesAtom = atomFamily((_frame: Frame) =>
  atomWithReset<string[]>([]),
);

/**
 * 選択されているエントリの name 一覧。
 */
export const $selectedEntryNames = atomFamily((frame: Frame) =>
  atom(
    (get) => {
      const entries = get($filteredEntries(frame));
      const names = get(selectedEntryNamesAtom(frame));
      // 順番を最新のエントリ一覧に合わせてから返す。
      // データをセットした後に sort 等の変更があった場合、
      // 順番が異なっている可能性があるため。
      return names.sort((a, b) => {
        const indexA = entries.findIndex((e) => e.name === a);
        const indexB = entries.findIndex((e) => e.name === b);
        return indexA - indexB;
      });
    },
    (get, set, newVal: SetStateAction<string[]> | typeof RESET) => {
      const curVal = get(selectedEntryNamesAtom(frame));
      if (typeof newVal === 'function') {
        newVal = newVal(curVal);
      }
      if (newVal === RESET || newVal.length === 0) {
        set(selectedEntryNamesAtom(frame), RESET);
        return;
      }

      const entries = get($filteredEntries(frame));

      // `..` は選択できないようにし、空文字も弾く。
      // 念のため、エントリ名の存在チェックも行う。
      // filter-out されているエントリは選択できないようにしたいので
      // $filteredEntries を使う。
      const names = [...new Set(newVal)].filter(
        (n) => n !== '' && n !== '..' && entries.some((e) => e.name === n),
      );

      set(selectedEntryNamesAtom(frame), names);
    },
  ),
);
