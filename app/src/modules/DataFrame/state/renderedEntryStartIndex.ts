import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';

import type { Frame } from '@modules/App/types';

export const $renderedEntryStartIndex = atomFamily((_frame: Frame) => atom(0));
