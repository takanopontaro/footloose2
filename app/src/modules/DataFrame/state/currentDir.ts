import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { $config, $modes, $prevSessionDir } from '@modules/App/state';
import { $history } from '@modules/DataFrame/state';

import type { SetStateAction } from 'jotai';
import type { Frame } from '@modules/App/types';

const currentDirAtom = atomFamily((_frame: Frame) => atom(''));

export const $currentDir = atomFamily((frame: Frame) =>
  atom(
    (get) => get(currentDirAtom(frame)),
    (get, set, newVal: SetStateAction<string>) => {
      const curVal = get(currentDirAtom(frame));
      if (typeof newVal === 'function') {
        newVal = newVal(curVal);
      }
      if (newVal === curVal) {
        return;
      }
      set(currentDirAtom(frame), newVal);
      set($prevSessionDir(frame), newVal);

      const modes = get($modes(frame));
      if (modes.includes('virtual-dir')) {
        return;
      }

      let h = get($history(frame));
      h = h.filter((v) => v !== newVal);
      h.unshift(newVal);
      const { settings } = get($config);
      const maxHistory = settings.maxHistoryCount;
      if (h.length > maxHistory) {
        h.length = maxHistory;
      }
      set($history(frame), h);
    },
  ),
);
