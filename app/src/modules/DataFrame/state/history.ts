import { atomFamily, atomWithStorage } from 'jotai/utils';

import type { Frame } from '@modules/App/types';

export const $history = atomFamily((frame: Frame) =>
  atomWithStorage<string[]>(`history:${frame}`, [], undefined, {
    getOnInit: true,
  }),
);
