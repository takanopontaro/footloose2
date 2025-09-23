import { useAtomValue } from 'jotai';
import { useAtomCallback } from 'jotai/utils';
import { useCallback, useEffect } from 'react';
import { $ws } from '@modules/App/state';
import {
  $activeEntryName,
  $currentDir,
  $filteredEntries,
  $rawEntries,
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
  newRawEntries: Entry[],
  newFilteredEntries: Entry[],
  activeEntryName: string,
): string {
  let index = oldRawEntries.findIndex((e) => e.name === activeEntryName);
  while (index > 0) {
    const name = oldRawEntries[--index].name;
    if (!newRawEntries.some((e) => e.name === name)) {
      continue;
    }
    if (newFilteredEntries.some((e) => e.name === name)) {
      return name;
    }
  }
  return '..';
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
        set($rawEntries(frame), newRawEntries);

        // コールバック引数の set, get は即時反映なため、
        // filteredEntries には既に newRawEntries が反映されている。
        const newFilteredEntries = get($filteredEntries(frame));

        const hasDeletedEntries =
          oldRawEntries.some((e) => e.name === activeEntryName) &&
          !newRawEntries.some((e) => e.name === activeEntryName);

        if (!hasDeletedEntries) {
          return;
        }

        // カレント行だったエントリーが削除された場合の、次のカレント行。
        const entryName = getFallbackActiveEntryName(
          oldRawEntries,
          newRawEntries,
          newFilteredEntries,
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
