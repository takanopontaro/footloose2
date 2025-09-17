import { useAtomValue } from 'jotai';
import { useAtomCallback } from 'jotai/utils';
import { useCallback, useEffect } from 'react';
import { $api, $ws } from '@modules/App/state';
import { $currentDir } from '@modules/DataFrame/state';

import type { Frame, WsWatchErrorResponse } from '@modules/App/types';

export const useWatchError = (frame: Frame): void => {
  const ws = useAtomValue($ws);
  const api = useAtomValue($api);

  const handleWatchError = useAtomCallback<void, [WsWatchErrorResponse]>(
    useCallback(
      (get, _set, resp) => {
        const dirName = get($currentDir(frame));
        const { msg, path } = resp.data;
        if (path === dirName) {
          api.writeLog(msg, 'error');
          api.changeDir('~', frame);
        }
      },
      [api, frame],
    ),
  );

  useEffect(() => {
    ws.registerListener('WATCH_ERROR', handleWatchError);
    return () => {
      ws.removeListener('WATCH_ERROR', handleWatchError);
    };
  }, [handleWatchError, ws]);
};
