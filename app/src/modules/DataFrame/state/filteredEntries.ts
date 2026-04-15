import { atom } from 'jotai';
import { atomFamily } from 'jotai-family';
import { buildRegexStr } from '@modules/DataFrame/libs';
import {
  $filterQuery,
  $matchMode,
  $sortedEntries,
} from '@modules/DataFrame/state';

import type { Frame } from '@modules/App/types';

/**
 * EntryFilter で filter-out された後のエントリ一覧。
 * ソートも反映されている。
 */
export const $filteredEntries = atomFamily((frame: Frame) =>
  atom((get) => {
    const entries = get($sortedEntries(frame));

    // entries には必ず `..` が含まれるが、初回読込時のみ空である。
    if (entries.length === 0) {
      return entries;
    }

    const filter = get($filterQuery(frame));
    if (filter.trim() === '') {
      return entries;
    }

    let copy = [...entries];

    // `..` を一時退避する。
    const parent = copy.shift();
    if (!parent) {
      throw new Error('unreachable');
    }

    // パターン入力中は容易に不完全な正規表現になり得るため、
    // try-catch でしっかりガードする。
    try {
      const matchMode = get($matchMode(frame));
      const pattern = buildRegexStr(filter, matchMode);
      const re = new RegExp(pattern, 'i');
      copy = copy.filter((e) => re.test(e.name));
    } catch (_e) {
      // 握りつぶす ✊💥
    }

    // `..` を戻す。
    copy.unshift(parent);
    return copy;
  }),
);
