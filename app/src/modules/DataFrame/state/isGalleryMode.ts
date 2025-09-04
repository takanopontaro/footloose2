import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { $modes } from '@modules/App/state';

import type { Frame } from '@modules/App/types';

export const $isGalleryMode = atomFamily((frame: Frame) =>
  atom((get) => {
    const modes = get($modes(frame));
    return modes.includes('gallery');
  }),
);
