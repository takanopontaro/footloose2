import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { $filterQuery, $rawEntries, $sort } from '@modules/DataFrame/state';

import type { SetStateAction } from 'jotai';
import type { Frame } from '@modules/App/types';
import type { Entry } from '@modules/DataFrame/types';

export const $filteredEntries = atomFamily((frame: Frame) =>
  atom(
    (get) => {
      let entries = get($rawEntries(frame));
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
    },
    (get, set, newVal: SetStateAction<Entry[]>) => {
      if (typeof newVal === 'function') {
        const curVal = get($rawEntries(frame));
        newVal = newVal(curVal);
      }
      // ここで newVal と curVal の同一性チェックを入れようと考えたが、
      // 同じデータで setter が呼ばれる可能性が低いのと、
      // 比較のコストが馬鹿にならないため、やらないことにした。
      set($rawEntries(frame), newVal);
      set($sort(frame), (prev) => ({ ...prev }));
    },
  ),
);
