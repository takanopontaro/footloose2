import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { $rawEntries, $sort } from '@modules/DataFrame/state';

import type { Frame } from '@modules/App/types';
import type { Entry, SortCriterion } from '@modules/DataFrame/types';

/**
 * 容量の単位とバイト数の定義。
 */
const sizeUnits = new Map([
  ['B', 1],
  ['K', 1024],
  ['M', 1024 ** 2],
  ['G', 1024 ** 3],
  ['T', 1024 ** 4],
]);

/**
 * 容量表記からバイト数を算出する。
 * 例： `1.5M` -> 1572864
 *
 * @param size - エントリの size
 * @return バイト数
 */
function sizeToBytes(size: string): number {
  if (size === '0') {
    return 0;
  }
  const unit = size.slice(-1);
  const value = parseFloat(size.slice(0, -1));
  return value * (sizeUnits.get(unit) ?? 1);
}

/**
 * 派生エントリ群。
 * ソートの補助データとして使用する。
 */
type DerivedEntries = Map<
  string,
  {
    /**
     * Entry.name を小文字に変換したもの。
     */
    name: string;
    /**
     * Entry.time を ISO 8601 形式に変換したもの。
     */
    time: string;
  }
>;

/**
 * エントリの指定したフィールドを比較するソート関数。
 * ソートのコストを下げるため、補助データとして派生エントリ群を使用する。
 *
 * @param a - エントリ A
 * @param b - エントリ B
 * @param field - 比較するフィールド
 * @param derivedEntries - 派生エントリ群
 * @return 比較結果
 */
function compareFields(
  a: Entry,
  b: Entry,
  field: keyof Entry,
  derivedEntries: DerivedEntries,
): number {
  const a2 = derivedEntries.get(a.name);
  const b2 = derivedEntries.get(b.name);
  if (!a2 || !b2) {
    throw new Error('unreachable');
  }
  if (field === 'name') {
    return a2.name > b2.name ? 1 : -1;
  }
  if (field === 'size') {
    return sizeToBytes(a.size) - sizeToBytes(b.size);
  }
  if (field === 'time') {
    if (a2.time === b2.time) {
      return 0;
    }
    // ISO 8601 形式のため、そのまま比較できる。
    return a2.time < b2.time ? -1 : 1;
  }
  if (a[field] === b[field]) {
    return 0;
  }
  return a[field] > b[field] ? 1 : -1;
}

/**
 * yy/mm/dd hh:mm:ss の正規表現。
 */
const datetimeRegex = /^(\d{2})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

/**
 * エントリをソートする。
 *
 * @param entries - エントリ一覧
 * @param criterion - ソート基準
 */
function sortEntries(entries: Entry[], criterion: SortCriterion): void {
  // ソートの精度と効率性を上げるための補助データ (派生エントリ群)。
  // name を小文字に、time を ISO 8601 形式にあらかじめ変換しておく。
  const derivedEntries: DerivedEntries = new Map(
    entries.map((e) => [
      e.name,
      {
        name: e.name.toLocaleLowerCase(),
        time: e.time.replace(datetimeRegex, '20$1-$2-$3T$4:$5:$6'),
      },
    ]),
  );
  entries.sort((a, b) => {
    const { field, order } = criterion;
    let comparison = compareFields(a, b, field, derivedEntries);
    if (order === 'desc') {
      comparison *= -1;
    }
    return comparison;
  });
}

/**
 * ディレクトリの表示位置を変更する。
 * 上にまとめる、下にまとめる、等。
 *
 * @param entries - エントリ一覧
 * @param pos - ディレクトリの表示位置
 */
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

/**
 * ソート済みのエントリ一覧。
 */
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
