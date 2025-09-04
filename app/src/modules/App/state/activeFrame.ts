import { atom } from 'jotai';

import type { Frame } from '@modules/App/types';

export const $activeFrame = atom<Frame>('a');
