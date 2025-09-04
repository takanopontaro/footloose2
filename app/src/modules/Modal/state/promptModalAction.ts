import { atomWithReset } from 'jotai/utils';

import type { PromptModalAction } from '@modules/Modal/types';

export const $promptModalAction = atomWithReset<PromptModalAction>({
  primary: () => {},
});
