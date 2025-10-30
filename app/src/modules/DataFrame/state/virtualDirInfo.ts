import { atom } from 'jotai';
import { RESET, atomFamily, atomWithReset } from 'jotai/utils';
import { shallowEqualObject } from '@libs/utils';
import { $modes } from '@modules/App/state';

import type { SetStateAction } from 'jotai';
import type { Frame } from '@modules/App/types';
import type { VirtualDirInfo } from '@modules/DataFrame/types';

const virtualDirInfoAtom = atomFamily((_frame: Frame) =>
  atomWithReset<VirtualDirInfo | null>(null),
);

/**
 * 仮想ディレクトリの詳細情報。
 */
export const $virtualDirInfo = atomFamily((frame: Frame) =>
  atom(
    (get) => get(virtualDirInfoAtom(frame)),
    (
      get,
      set,
      newVal: SetStateAction<VirtualDirInfo | null> | typeof RESET,
    ) => {
      const curVal = get(virtualDirInfoAtom(frame));
      if (typeof newVal === 'function') {
        newVal = newVal(curVal);
      }
      if (newVal === RESET || newVal === null) {
        set(virtualDirInfoAtom(frame), RESET);
        set($modes(frame), (prev) => prev.filter((m) => m !== 'virtual-dir'));
        return;
      }
      if (curVal !== null && shallowEqualObject(newVal, curVal)) {
        return;
      }
      set(virtualDirInfoAtom(frame), newVal);
      set($modes(frame), (prev) => [...prev, 'virtual-dir']);
    },
  ),
);
