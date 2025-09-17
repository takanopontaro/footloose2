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

export const useDirUpdate = (frame: Frame): void => {
  const ws = useAtomValue($ws);

  const handleDirUpdate = useAtomCallback<void, [WsDirUpdateResponse]>(
    useCallback(
      (get, set, resp) => {
        const dirName = get($currentDir(frame));
        const { entries: newRawEntries, path } = resp.data;
        if (path !== dirName) {
          return;
        }
        const oldRawEntries = get($rawEntries(frame));
        set($filteredEntries(frame), newRawEntries);
        const newEntries = get($filteredEntries(frame));
        const curName = get($activeEntryName(frame));
        const deleted =
          oldRawEntries.some((e) => e.name === curName) &&
          !newRawEntries.some((e) => e.name === curName);
        if (!deleted) {
          return;
        }
        let done = false;
        let index = oldRawEntries.findIndex((e) => e.name === curName);
        while (index > 0) {
          const prevEntry = oldRawEntries[--index];
          const ent = newRawEntries.find((e) => e.name === prevEntry.name);
          if (!ent) {
            continue;
          }
          const found = newEntries.some((e) => e.name === prevEntry.name);
          if (found) {
            done = true;
            set($activeEntryName(frame), ent.name);
            break;
          }
        }
        if (!done) {
          set($activeEntryName(frame), '..');
        }
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
