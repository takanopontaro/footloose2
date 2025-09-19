import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import {
  $filteredEntries,
  $firstVisibleEntryIndex,
  $lastVisibleEntryIndex,
} from '@modules/DataFrame/state';

import type { Frame } from '@modules/App/types';

export const $renderedEntries = atomFamily((frame: Frame) =>
  atom((get) => {
    const entries = get($filteredEntries(frame));
    const firstEntryIndex = get($firstVisibleEntryIndex(frame));
    const lastEntryIndex = get($lastVisibleEntryIndex(frame));
    return entries.slice(firstEntryIndex, lastEntryIndex + 1);
  }),
);
