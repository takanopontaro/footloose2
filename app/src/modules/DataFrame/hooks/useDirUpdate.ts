import { useAtomValue } from 'jotai';
import { useAtomCallback } from 'jotai/utils';
import { useCallback, useEffect } from 'react';
import { $ws } from '@modules/App/state';
import {
  $activeEntryName,
  $currentDir,
  $filteredEntries,
  $rawEntries,
  $selectedEntryNames,
  $sortedEntries,
} from '@modules/DataFrame/state';

import type { Frame, WsDirUpdateResponse } from '@modules/App/types';
import type { Entry } from '@modules/DataFrame/types';

/**
 * カレントだったエントリが削除された場合の、新しいカレントエントリを返す。
 * 新カレントは、可能な限りひとつ前のエントリとする。
 * それも削除されていれば更にひとつ前…と繰り返し、無ければ `..` とする。
 * 存在していても filter-out されている場合はカレントにはできないため、次の候補を探す。
 *
 * @param oldSortedEntries - 旧エントリ一覧
 *   他の引数と同じように name 集合にしたいところだが、index を使いたいため配列で受け取る。
 * @param filteredEntryNames - filter-out 後のエントリ一覧の name 集合
 * @param prevActiveEntryName - 旧カレントエントリの name
 * @returns 新カレントエントリの name
 */
function getFallbackActiveEntryName(
  oldSortedEntries: Entry[],
  filteredEntryNames: Set<string>,
  prevActiveEntryName: string,
): string {
  let index = oldSortedEntries.findIndex((e) => e.name === prevActiveEntryName);
  while (index > 0) {
    const { name } = oldSortedEntries[--index];
    if (filteredEntryNames.has(name)) {
      return name;
    }
  }
  return '..';
}

/**
 * 選択行だったエントリが削除された場合を考慮した、新しい選択行リストを返す。
 * filter-out されているエントリは選択対象外のため、
 * 単純に $filteredEntries に含まれないエントリを除外するだけでよい。
 * 結果として、削除されたエントリも省かれる。
 *
 * @param filteredEntryNames - filter-out 後のエントリ一覧の name 集合
 * @param selectedEntryNames - 選択行の name 一覧
 * @returns 新選択行の name 一覧
 */
function getFallbackSelectedEntryNames(
  filteredEntryNames: Set<string>,
  selectedEntryNames: string[],
): string[] {
  return selectedEntryNames.filter((name) => filteredEntryNames.has(name));
}

/**
 * ディレクトリが更新された時の処理を行う。
 * サーバーからイベントが飛んでくるので、エントリの更新などを行う。
 *
 * @param frame - 対象フレーム
 */
export const useDirUpdate = (frame: Frame): void => {
  const ws = useAtomValue($ws);

  const handleDirUpdate = useAtomCallback<void, [WsDirUpdateResponse]>(
    useCallback(
      (get, set, resp) => {
        const curDir = get($currentDir(frame));
        const { entries: newRawEntries, path } = resp.data;

        // 他フレームの更新イベントは無視する。
        if (path !== curDir) {
          return;
        }

        const activeEntryName = get($activeEntryName(frame));

        // 更新前のエントリ一覧と name 集合を取得する。
        const oldSortedEntries = get($sortedEntries(frame));
        const oldSortedEntryNames = new Set(
          oldSortedEntries.map((e) => e.name),
        );

        // エントリ一覧を更新する。
        set($rawEntries(frame), newRawEntries);

        // 更新後のエントリ一覧と name 集合を取得する。
        // コールバック引数の set, get は即時反映なため、
        // $sortedEntries にはすでに newRawEntries が反映されている。
        const newSortedEntries = get($sortedEntries(frame));
        const newSortedEntryNames = new Set(
          newSortedEntries.map((e) => e.name),
        );

        // カレントだったエントリが削除されたか否か。
        const isDeleted =
          oldSortedEntryNames.has(activeEntryName) &&
          !newSortedEntryNames.has(activeEntryName);

        if (!isDeleted) {
          return;
        }

        // コールバック引数の set, get は即時反映なため、
        // $filteredEntries にはすでに newRawEntries が反映されている。
        const filteredEntries = get($filteredEntries(frame));
        const filteredEntryNames = new Set(filteredEntries.map((e) => e.name));
        const selectedEntryNames = get($selectedEntryNames(frame));

        // 選択行だったエントリが削除された場合を考慮した、新しい選択行リスト。
        const entryNames = getFallbackSelectedEntryNames(
          filteredEntryNames,
          selectedEntryNames,
        );

        set($selectedEntryNames(frame), entryNames);

        // カレントだったエントリが削除された場合の、新しいカレントエントリ。
        const entryName = getFallbackActiveEntryName(
          oldSortedEntries,
          filteredEntryNames,
          activeEntryName,
        );

        set($activeEntryName(frame), entryName);
      },
      [frame],
    ),
  );

  useEffect(() => {
    ws.registerListener('DIR_UPDATE', handleDirUpdate);
    return () => {
      ws.removeListener('DIR_UPDATE', handleDirUpdate);
    };
  }, [handleDirUpdate, ws]);
};
