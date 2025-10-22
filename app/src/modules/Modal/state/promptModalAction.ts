import { atomWithReset } from 'jotai/utils';

import type { PromptModalAction } from '@modules/Modal/types';

/**
 * PromptModal のアクション設定。
 */
export const $promptModalAction = atomWithReset<PromptModalAction>({
  primary: () => {},
});
