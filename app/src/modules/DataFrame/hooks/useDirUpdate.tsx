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

// カレント行だったエントリーが削除された場合の、新しいカレント行を返す。
// 新カレントは、可能な限りひとつ前のエントリーとする。
// それも削除されていれば更にひとつ前…と繰り返し、無ければ `..` とする。
// newRawEntries に対象エントリーがあっても、filter-out されている場合は
// カレント行にはできないため、次の候補を探す。
function getFallbackActiveEntryName(
  oldRawEntries: Entry[],
  newRawEntryNames: Set<string>,
  filteredEntryNames: Set<string>,
  activeEntryName: string,
): string {
  let index = oldRawEntries.findIndex((e) => e.name === activeEntryName);
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

// 選択行だったエントリーが削除された場合を考慮した、新しい選択行リストを返す。
// filter-out されているエントリーは選択対象外のため、
// 単純に filteredEntries に含まれないエントリーを除外するだけでよい。
// 結果として、削除されたエントリーも省かれる。
function getFallbackSelectedEntryNames(
  filteredEntryNames: Set<string>,
  selectedEntryNames: string[],
): string[] {
  return selectedEntryNames.filter((name) => filteredEntryNames.has(name));
}

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
        // filteredEntries には既に newRawEntries が反映されている。
        const filteredEntries = get($filteredEntries(frame));
        const filteredEntryNames = new Set(filteredEntries.map((e) => e.name));
        const selectedEntryNames = get($selectedEntryNames(frame));

        // 選択行だったエントリーが削除された場合を考慮した、新しい選択行リスト。
        const entryNames = getFallbackSelectedEntryNames(
          filteredEntryNames,
          selectedEntryNames,
        );

        set($selectedEntryNames(frame), entryNames);

        // カレント行だったエントリーが削除された場合の、次のカレント行。
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
