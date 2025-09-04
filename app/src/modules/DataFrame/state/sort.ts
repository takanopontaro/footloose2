import { atom } from 'jotai';
import { RESET, atomFamily, atomWithReset } from 'jotai/utils';
import { $rawEntries } from '@modules/DataFrame/state';

import type { Getter, SetStateAction, Setter } from 'jotai';
import type { Frame } from '@modules/App/types';
import type { Entry, SortCriterion } from '@modules/DataFrame/types';

// Map of size units to byte counts.
const sizeUnits = new Map([
  ['B', 1],
  ['K', 1024],
  ['M', 1024 ** 2],
  ['G', 1024 ** 3],
  ['T', 1024 ** 4],
]);

// Convert a size string with units to a byte count.
// '1.5M' -> 1572864
function sizeToBytes(size: string): number {
  if (size === '0') {
    return 0;
  }
  const unit = size.slice(-1);
  const value = parseFloat(size.slice(0, -1));
  return value * (sizeUnits.get(unit) ?? 1);
}

// Perform a comparison appropriate for the field.
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

// Sort an array of entries.
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

function sortRawEntries(
  get: Getter,
  set: Setter,
  frame: Frame,
  sort: SortCriterion,
): void {
  const [parent, ...entries] = get($rawEntries(frame));
  sortEntries(entries, sort);
  sortDirPosition(entries, sort.dir);
  set($rawEntries(frame), [parent].concat(entries));
}

const defaultSort: SortCriterion = { field: 'name', order: 'asc', dir: 'top' };

const sortAtom = atomFamily((_frame: Frame) =>
  atomWithReset<SortCriterion>(defaultSort),
);

export const $sort = atomFamily((frame: Frame) =>
  atom(
    (get) => get(sortAtom(frame)),
    (get, set, newVal: SetStateAction<SortCriterion> | typeof RESET) => {
      const curVal = get(sortAtom(frame));
      if (typeof newVal === 'function') {
        newVal = newVal(curVal);
      }
      if (newVal === RESET) {
        set(sortAtom(frame), RESET);
        sortRawEntries(get, set, frame, defaultSort);
        return;
      }
      // entries が更新された時に現在の SortCriterion を反映させるため、
      // curVal === newVal の場合でも実行する
      set(sortAtom(frame), newVal);
      sortRawEntries(get, set, frame, newVal);
    },
  ),
);
