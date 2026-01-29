import { atomWithReset } from 'jotai/utils';

import type { MatchMode } from '@modules/App/types';

/**
 * ListModal のマッチモード。
 */
export const $listModalMatchMode = atomWithReset<MatchMode>('normal');
