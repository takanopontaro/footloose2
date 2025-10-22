import { atomWithReset } from 'jotai/utils';

import type { ConfirmModalAction } from '@modules/Modal/types';

/**
 * ConfirmModal のアクション設定。
 */
export const $confirmModalAction = atomWithReset<ConfirmModalAction>({
  primary: () => {},
});
