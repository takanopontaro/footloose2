import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import {
  $gridColumnCount,
  $maxVisibleRowCount,
  $firstVisibleEntryIndex,
} from '@modules/DataFrame/state';

import type { Frame } from '@modules/App/types';

export const $lastVisibleEntryIndex = atomFamily((frame: Frame) =>
  atom((get) => {
    const firstEntryIndex = get($firstVisibleEntryIndex(frame));
    const maxRowCount = get($maxVisibleRowCount(frame));
    const gridColumnCount = get($gridColumnCount(frame));
    return firstEntryIndex + gridColumnCount * maxRowCount - 1;
  }),
);
