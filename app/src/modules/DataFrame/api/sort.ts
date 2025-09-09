import { RESET } from 'jotai/utils';
import { readState, writeState } from '@libs/utils';
import { $activeFrame } from '@modules/App/state';
import { $sort } from '@modules/DataFrame/state';

import type { SortCriterion } from '@modules/DataFrame/types';

function sortEntries(
  field: SortCriterion['field'],
  order: SortCriterion['order'],
  frame = readState($activeFrame),
): void {
  writeState($sort(frame), (prev) => ({ ...prev, field, order }));
}

function cycleSortOrder(
  field: SortCriterion['field'],
  frame = readState($activeFrame),
): void {
  const curVal = readState($sort(frame));
  if (curVal.field !== field) {
    writeState($sort(frame), (prev) => ({ ...prev, field, order: 'asc' }));
    return;
  }
  writeState($sort(frame), (prev) => ({
    ...prev,
    order: curVal.order === 'asc' ? 'desc' : 'asc',
  }));
}

function clearSort(frame = readState($activeFrame)): void {
  writeState($sort(frame), RESET);
}

function setDirPosition(
  pos: SortCriterion['dir'],
  frame = readState($activeFrame),
): void {
  writeState($sort(frame), (prev) => ({ ...prev, dir: pos }));
}

function cycleDirPosition(frame = readState($activeFrame)): void {
  writeState($sort(frame), (prev) => {
    const newPos =
      prev.dir === 'top' ? 'bottom' : prev.dir === 'bottom' ? 'none' : 'top';
    return { ...prev, dir: newPos };
  });
}

export {
  sortEntries,
  cycleSortOrder,
  clearSort,
  setDirPosition,
  cycleDirPosition,
};
