import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { sortDirPosition, sortEntries } from '@modules/DataFrame/libs';
import { $rawEntries, $sort } from '@modules/DataFrame/state';

import type { Frame } from '@modules/App/types';

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
