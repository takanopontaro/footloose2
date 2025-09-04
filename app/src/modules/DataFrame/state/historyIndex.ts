import { atomFamily, atomWithReset } from 'jotai/utils';

import type { Frame } from '@modules/App/types';

export const $historyIndex = atomFamily((_frame: Frame) => atomWithReset(0));
