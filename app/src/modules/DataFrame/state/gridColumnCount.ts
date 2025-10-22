import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { getCssVariable } from '@libs/utils';
import { $isGalleryMode } from '@modules/DataFrame/state';

import type { Frame } from '@modules/App/types';

/**
 * グリッドの列数。
 * リスト表示時は 1 列である。
 */
export const $gridColumnCount = atomFamily((frame: Frame) =>
  atom((get) => {
    const isGalleryMode = get($isGalleryMode(frame));
    if (isGalleryMode) {
      return parseInt(getCssVariable('--grid-column-count'));
    }
    return 1;
  }),
);
