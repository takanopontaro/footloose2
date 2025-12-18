import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { debounce, getCssVariable } from '@libs/utils';
import { $isGalleryMode } from '@modules/DataFrame/state';

import type { SetStateAction } from 'jotai';
import type { Frame } from '@modules/App/types';

/**
 * CSS カスタムプロパティで定義されている「グリッドの列数」を取得する。
 *
 * @returns グリッドの列数
 */
function getGridColumnCount(): number {
  const n = parseInt(getCssVariable('--grid-column-count'), 10);
  if (Number.isFinite(n)) {
    return n;
  }
  throw new Error('`--grid-column-count` is not defined in your css');
}

const gridColumnCountAtom = atomFamily((_frame: Frame) => atom(1));

/**
 * グリッドの列数。
 * リスト表示時は 1 列である。
 */
export const $gridColumnCount = atomFamily((frame: Frame) => {
  const atm = atom(
    (get) => {
      const isGalleryMode = get($isGalleryMode(frame));
      const val = get(gridColumnCountAtom(frame));
      return isGalleryMode ? val : 1;
    },
    // この setter は onMount からのみ呼び出される想定。
    (_get, set, newVal: SetStateAction<number>) => {
      set(gridColumnCountAtom(frame), newVal);
    },
  );

  atm.onMount = (set) => {
    const update = (): void => set(getGridColumnCount());
    update(); // 念のため…
    const fn = debounce(update, 200);
    window.addEventListener('resize', fn);
    return () => {
      fn.cancel();
      window.removeEventListener('resize', fn);
    };
  };

  return atm;
});
