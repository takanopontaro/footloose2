import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { $config } from '@modules/App/state';
import { $history, $modes, $prevSessionDir } from '@modules/DataFrame/state';

import type { SetStateAction } from 'jotai';
import type { Frame } from '@modules/App/types';

const currentDirAtom = atomFamily((_frame: Frame) => atom(''));

/**
 * カレントディレクトリのパス。
 */
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

      // virtual-dir モードの時は履歴を残したくないため return する。
      const modes = get($modes(frame));
      if (modes.includes('virtual-dir')) {
        return;
      }

      const history = get($history(frame));
      const newHistory = history.filter((h) => h !== newVal);
      newHistory.unshift(newVal);

      const { maxHistoryCount } = get($config).settings;
      if (newHistory.length > maxHistoryCount) {
        newHistory.length = maxHistoryCount;
      }

      set($history(frame), newHistory);
    },
  ),
);
