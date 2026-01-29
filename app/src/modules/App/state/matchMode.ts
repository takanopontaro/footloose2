import { atomFamily, atomWithReset } from 'jotai/utils';

import type { Frame, MatchMode } from '@modules/App/types';

/**
 * マッチモード。
 */
export const $matchMode = atomFamily((_frame: Frame) =>
  atomWithReset<MatchMode>('normal'),
);
