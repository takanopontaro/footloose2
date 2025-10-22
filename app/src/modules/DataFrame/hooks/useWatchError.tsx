import { useAtomValue } from 'jotai';
import { useAtomCallback } from 'jotai/utils';
import { useCallback, useEffect } from 'react';
import { $api, $ws } from '@modules/App/state';
import { $currentDir } from '@modules/DataFrame/state';

import type { Frame, WsWatchErrorResponse } from '@modules/App/types';

/**
 * ウォッチエラーを処理する。
 * 今いるディレクトリが削除されるなど、何か問題が起きた時に発生する。
 * フォールバックとしてホームディレクトリに移動する。
 *
 * @param frame - 対象フレーム
 */
export const useWatchError = (frame: Frame): void => {
  const ws = useAtomValue($ws);
  const api = useAtomValue($api);

  const handleWatchError = useAtomCallback<void, [WsWatchErrorResponse]>(
    useCallback(
      (get, _set, resp) => {
        const curDir = get($currentDir(frame));
        const { msg, path } = resp.data;
        if (path === curDir) {
          api.writeLog(msg, 'error');
          // ホームディレクトリに移動する。
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
