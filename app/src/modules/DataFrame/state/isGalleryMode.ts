import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { $modes } from '@modules/DataFrame/state';

import type { Frame } from '@modules/App/types';

/**
 * 現在 gallery モードか否か。
 */
export const $isGalleryMode = atomFamily((frame: Frame) =>
  atom((get) => {
    const modes = get($modes(frame));
    return modes.includes('gallery');
  }),
);
