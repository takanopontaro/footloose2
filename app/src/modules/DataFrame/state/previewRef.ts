import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';

import type { Frame } from '@modules/App/types';

export const $previewRef = atomFamily((_frame: Frame) =>
  atom<HTMLIFrameElement | HTMLVideoElement | null>(null),
);
