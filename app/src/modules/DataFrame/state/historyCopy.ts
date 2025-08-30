import { $modes } from '@modules/App/state';
import { atom } from 'jotai';
import { RESET, atomFamily, atomWithReset } from 'jotai/utils';
import type { Frame } from '@modules/App/types';
import type { SetStateAction } from 'jotai';

const historyCopyAtom = atomFamily((_frame: Frame) =>
  atomWithReset<string[] | null>(null),
);

export const $historyCopy = atomFamily((frame: Frame) =>
  atom(
    (get) => get(historyCopyAtom(frame)),
    (get, set, newVal: SetStateAction<string[] | null> | typeof RESET) => {
      if (typeof newVal === 'function') {
        const curVal = get(historyCopyAtom(frame));
        newVal = newVal(curVal);
      }
      // ここで newVal と curVal の同一性チェックを入れようと考えたが、
      // 同じデータで setter が呼ばれる可能性が低いのと、
      // 比較のコストが馬鹿にならないため、やらないことにした。
      if (newVal === RESET || newVal === null) {
        set(historyCopyAtom(frame), RESET);
        set($modes(frame), (prev) => prev.filter((m) => m !== 'history'));
        return;
      }
      set(historyCopyAtom(frame), newVal);
      set($modes(frame), (prev) => [...prev, 'history']);
    },
  ),
);
