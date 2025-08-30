import { atomFamily, atomWithStorage } from 'jotai/utils';
import type { Frame } from '@modules/App/types';

export const $prevSessionDir = atomFamily((frame: Frame) =>
  atomWithStorage(`prevSessionDir:${frame}`, '~', undefined, {
    getOnInit: true,
  }),
);
