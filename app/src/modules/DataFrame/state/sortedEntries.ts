import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { $rawEntries, $sort } from '@modules/DataFrame/state';

import type { Frame } from '@modules/App/types';
import type { Entry, SortCriterion } from '@modules/DataFrame/types';

const sizeUnits = new Map([
  ['B', 1],
  ['K', 1024],
  ['M', 1024 ** 2],
  ['G', 1024 ** 3],
  ['T', 1024 ** 4],
]);

// '1.5M' -> 1572864
function sizeToBytes(size: string): number {
  if (size === '0') {
    return 0;
  }
  const unit = size.slice(-1);
  const value = parseFloat(size.slice(0, -1));
  return value * (sizeUnits.get(unit) ?? 1);
}

function compareFields(a: Entry, b: Entry, field: keyof Entry): number {
  if (field === 'size') {
    return sizeToBytes(a.size) - sizeToBytes(b.size);
  }
  if (field === 'time') {
    return a.time.localeCompare(b.time);
  }
  if (field === 'name') {
    return a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase() ? 1 : -1;
  }
  if (a[field] === b[field]) {
    return 0;
  }
  return a[field] > b[field] ? 1 : -1;
}

function sortEntries(entries: Entry[], criterion: SortCriterion): void {
  entries.sort((a, b) => {
    const { field, order } = criterion;
    let comparison = compareFields(a, b, field);
    if (order === 'desc') {
      comparison *= -1;
    }
    return comparison;
  });
}

function sortDirPosition(entries: Entry[], pos: SortCriterion['dir']): void {
  if (pos === 'none') {
    return;
  }
  const sortDirection = pos === 'bottom' ? -1 : 1;
  entries.sort((a, b) => {
    const aIsDir = a.perm.startsWith('d');
    const bIsDir = b.perm.startsWith('d');
    const res = aIsDir === bIsDir ? 0 : aIsDir ? -1 : 1;
    return res * sortDirection;
  });
}

export const $sortedEntries = atomFamily((frame: Frame) =>
  atom((get) => {
    const rawEntries = get($rawEntries(frame));

    // 初回読込時のみ空である。
    if (rawEntries.length === 0) {
      return rawEntries;
    }

    const [parent, ...entries] = rawEntries;
    const sort = get($sort(frame));
    sortEntries(entries, sort);
    sortDirPosition(entries, sort.dir);

    return [parent].concat(entries);
  }),
);
