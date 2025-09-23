import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { $filterQuery, $sortedEntries } from '@modules/DataFrame/state';

import type { Frame } from '@modules/App/types';

export const $filteredEntries = atomFamily((frame: Frame) =>
  atom((get) => {
    let entries = get($sortedEntries(frame));
    entries = [...entries];
    // Temporarily store `..`.
    const parent = entries.shift();
    // `..` is always present, so this only applies when the initial value.
    if (parent === undefined) {
      return entries;
    }
    const filter = get($filterQuery(frame));
    if (filter !== '') {
      // パターン入力中の場合を考慮して、
      // 無効な正規表現の場合は catch 句で握りつぶす
      try {
        const re = new RegExp(filter, 'i');
        entries = entries.filter((v) => re.test(v.name));
      } catch (_e) {
        // 握りつぶす ✊💥
      }
    }
    // Restore `..`.
    entries.unshift(parent);
    return entries;
  }),
);
