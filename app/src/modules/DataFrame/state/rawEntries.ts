import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';

import type { Frame } from '@modules/App/types';
import type { Entry } from '@modules/DataFrame/types';

export const $rawEntries = atomFamily((_frame: Frame) => atom<Entry[]>([]));
