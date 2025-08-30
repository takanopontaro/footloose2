import { shallowEqualObject } from '@libs/utils';
import { $modes } from '@modules/App/state';
import { atom } from 'jotai';
import { RESET, atomFamily, atomWithReset } from 'jotai/utils';
import type { Frame } from '@modules/App/types';
import type { VirtualDirKind } from '@modules/DataFrame/types';
import type { SetStateAction } from 'jotai';

type VdConfig = { archive: string; kind: VirtualDirKind };

const virtualDirInfoAtom = atomFamily((_frame: Frame) =>
  atomWithReset<VdConfig | null>(null),
);

export const $virtualDirInfo = atomFamily((frame: Frame) =>
  atom(
    (get) => get(virtualDirInfoAtom(frame)),
    (get, set, newVal: SetStateAction<VdConfig | null> | typeof RESET) => {
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
