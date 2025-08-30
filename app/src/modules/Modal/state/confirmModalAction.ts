import { atomWithReset } from 'jotai/utils';
import type { ConfirmModalAction } from '@modules/Modal/types';

export const $confirmModalAction = atomWithReset<ConfirmModalAction>({
  primary: () => {},
});
