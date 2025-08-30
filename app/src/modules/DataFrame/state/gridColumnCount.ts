import { getCssVariable } from '@libs/utils';
import { $isGalleryMode } from '@modules/DataFrame/state';
import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import type { Frame } from '@modules/App/types';

export const $gridColumnCount = atomFamily((frame: Frame) =>
  atom((get) => {
    const isGalleryMode = get($isGalleryMode(frame));
    if (isGalleryMode) {
      return parseInt(getCssVariable('--grid-column-count'));
    }
    return 1;
  }),
);
