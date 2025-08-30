import { atomWithReset } from 'jotai/utils';
import type { ListModalAction } from '@modules/Modal/types';

export const $listModalAction = atomWithReset<ListModalAction>({
  primary: () => {},
});
