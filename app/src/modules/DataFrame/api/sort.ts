import { RESET } from 'jotai/utils';
import { get, set } from '@libs/utils';
import { $activeFrame } from '@modules/App/state';
import { $sort } from '@modules/DataFrame/state';

import type { SortCriterion } from '@modules/DataFrame/types';

function sortEntries(
  field: SortCriterion['field'],
  order: SortCriterion['order'],
  frame = get($activeFrame),
): void {
  set($sort(frame), (prev) => ({ ...prev, field, order }));
}

function cycleSortOrder(
  field: SortCriterion['field'],
  frame = get($activeFrame),
): void {
  const curVal = get($sort(frame));
  if (curVal.field !== field) {
    set($sort(frame), (prev) => ({ ...prev, field, order: 'asc' }));
    return;
  }
  set($sort(frame), (prev) => ({
    ...prev,
    order: curVal.order === 'asc' ? 'desc' : 'asc',
  }));
}

function clearSort(frame = get($activeFrame)): void {
  set($sort(frame), RESET);
}

function setDirPosition(
  pos: SortCriterion['dir'],
  frame = get($activeFrame),
): void {
  set($sort(frame), (prev) => ({ ...prev, dir: pos }));
}

function cycleDirPosition(frame = get($activeFrame)): void {
  set($sort(frame), (prev) => {
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
