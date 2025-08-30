import {
  $gridColumnCount,
  $maxRenderedRowCount,
  $renderedEntryStartIndex,
} from '@modules/DataFrame/state';
import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import type { Frame } from '@modules/App/types';

export const $renderedEntryEndIndex = atomFamily((frame: Frame) =>
  atom((get) => {
    const startRow = get($renderedEntryStartIndex(frame));
    const maxRowCount = get($maxRenderedRowCount(frame));
    const gridColumnCount = get($gridColumnCount(frame));
    return startRow + gridColumnCount * maxRowCount - 1;
  }),
);
