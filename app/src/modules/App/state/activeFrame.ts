import { atom } from 'jotai';

import type { Frame } from '@modules/App/types';

/**
 * アクティブなフレーム。
 */
export const $activeFrame = atom<Frame>('a');
