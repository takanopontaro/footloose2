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
} from '@modules/DataFrame/state';

import type { Frame, WsDirUpdateResponse } from '@modules/App/types';
import type { Entry } from '@modules/DataFrame/types';

/**
 * カレント行だったエントリが削除された場合の、新しいカレント行を返す。
 * 新カレントは、可能な限りひとつ前のエントリとする。
 * それも削除されていれば更にひとつ前…と繰り返し、無ければ `..` とする。
 * newRawEntries に対象エントリがあっても、
 * filter-out されている場合はカレント行にはできないため、次の候補を探す。
 *
 * @param oldRawEntries - 旧エントリ一覧
 * @param newRawEntryNames - 新エントリ一覧の name 集合
 * @param filteredEntryNames - filter-out 後のエントリ一覧の name 集合
 * @param prevActiveEntryName - 旧カレント行の name
 * @return 新カレント行の name
 */
function getFallbackActiveEntryName(
  oldRawEntries: Entry[],
  newRawEntryNames: Set<string>,
  filteredEntryNames: Set<string>,
  prevActiveEntryName: string,
): string {
  let index = oldRawEntries.findIndex((e) => e.name === prevActiveEntryName);
  while (index > 0) {
    const { name } = oldRawEntries[--index];
    if (!newRawEntryNames.has(name)) {
      continue;
    }
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
 * @return 新選択行の name 一覧
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
        const oldRawEntries = get($rawEntries(frame));
        const oldRawEntryNames = new Set(oldRawEntries.map((e) => e.name));
        const newRawEntryNames = new Set(newRawEntries.map((e) => e.name));

        set($rawEntries(frame), newRawEntries);

        const hasDeletedEntries =
          oldRawEntryNames.has(activeEntryName) &&
          !newRawEntryNames.has(activeEntryName);

        if (!hasDeletedEntries) {
          return;
        }

        // コールバック引数の set, get は即時反映なため、
        // $filteredEntries には既に newRawEntries が反映されている。
        const filteredEntries = get($filteredEntries(frame));
        const filteredEntryNames = new Set(filteredEntries.map((e) => e.name));
        const selectedEntryNames = get($selectedEntryNames(frame));

        // 選択行だったエントリが削除された場合を考慮した、新しい選択行リスト。
        const entryNames = getFallbackSelectedEntryNames(
          filteredEntryNames,
          selectedEntryNames,
        );

        set($selectedEntryNames(frame), entryNames);

        // カレント行だったエントリが削除された場合の、新しいカレント行。
        const entryName = getFallbackActiveEntryName(
          oldRawEntries,
          newRawEntryNames,
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
