import { atomWithReset } from 'jotai/utils';

import type { ListModalAction } from '@modules/Modal/types';

/**
 * ListModal のアクション設定。
 */
export const $listModalAction = atomWithReset<ListModalAction>({
  primary: () => {},
});
