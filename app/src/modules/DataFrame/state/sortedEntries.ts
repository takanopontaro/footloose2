import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { sortDirPosition, sortEntries } from '@modules/DataFrame/libs';
import { $rawEntries, $sort } from '@modules/DataFrame/state';

import type { Frame } from '@modules/App/types';

export const $sortedEntries = atomFamily((frame: Frame) =>
  atom((get) => {
    const [parent, ...entries] = get($rawEntries(frame));
    const sort = get($sort(frame));
    sortEntries(entries, sort);
    sortDirPosition(entries, sort.dir);
    return [parent].concat(entries);
  }),
);
