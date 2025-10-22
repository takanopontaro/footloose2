import { atomFamily, atomWithReset } from 'jotai/utils';

import type { Frame } from '@modules/App/types';
import type { SortCriterion } from '@modules/DataFrame/types';

/**
 * エントリ一覧のソート基準。
 */
export const $sort = atomFamily((_frame: Frame) =>
  atomWithReset<SortCriterion>({ field: 'name', order: 'asc', dir: 'top' }),
);
