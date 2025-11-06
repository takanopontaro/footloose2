import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useAtomCallback } from 'jotai/utils';
import { memo, useCallback, useEffect, useRef } from 'react';
import { $scope, $ws } from '@modules/App/state';
import {
  $logData,
  $logFrameRef,
  $progressTaskInfo,
} from '@modules/LogFrame/state';

import type { FC, FocusEvent } from 'react';
import type {
  WsProgressAbortResponse,
  WsProgressEndResponse,
  WsProgressErrorResponse,
  WsProgressResponse,
} from '@modules/App/types';

/**
 * ログを表示するコンポーネント。
 */
const LogFrameComponent: FC = () => {
  const divRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scope, setScope] = useAtom($scope);
  const [logData, setLogData] = useAtom($logData);
  const setLogFrameRef = useSetAtom($logFrameRef);
  const ws = useAtomValue($ws);

  // progress をセットする。
  const handleProgress = useAtomCallback<void, [WsProgressResponse]>(
    useCallback((_get, set, resp) => {
      const { pid, progress } = resp.data;
      set($progressTaskInfo(pid), (prev) => ({ ...prev, progress }));
    }, []),
  );

  // ProgressTask の終了処理をする。
  const handleProgressEnd = useAtomCallback<void, [WsProgressEndResponse]>(
    useCallback((_get, set, resp) => {
      const { pid } = resp.data;
      set($progressTaskInfo(pid), (prev) => ({
        ...prev,
        status: 'end',
        progress: 100,
      }));
    }, []),
  );

  // progress error の処理をする。
  const handleProgressError = useAtomCallback<void, [WsProgressErrorResponse]>(
    useCallback(
      (_get, set, resp) => {
        const { msg, pid } = resp.data;
        set($progressTaskInfo(pid), (prev) => ({ ...prev, status: 'error' }));
        setLogData({ log: msg, level: 'error' });
      },
      [setLogData],
    ),
  );

  // ProgressTask の中止処理をする。
  const handleProgressAbort = useAtomCallback<void, [WsProgressAbortResponse]>(
    useCallback((_get, set, resp) => {
      const { pid } = resp.data;
      set($progressTaskInfo(pid), (prev) => ({ ...prev, status: 'abort' }));
    }, []),
  );

  useEffect(() => {
    ws.registerListener('PROGRESS', handleProgress);
    ws.registerListener('PROGRESS_END', handleProgressEnd);
    ws.registerListener('PROGRESS_ERROR', handleProgressError);
    ws.registerListener('PROGRESS_ABORT', handleProgressAbort);
    return () => {
      ws.removeListener('PROGRESS', handleProgress);
      ws.removeListener('PROGRESS_END', handleProgressEnd);
      ws.removeListener('PROGRESS_ERROR', handleProgressError);
      ws.removeListener('PROGRESS_ABORT', handleProgressAbort);
    };
  }, [
    handleProgress,
    handleProgressAbort,
    handleProgressEnd,
    handleProgressError,
    ws,
  ]);

  useEffect(() => {
    if (scope === 'LogFrame') {
      divRef.current?.focus();
    }
  }, [scope]);

  useEffect(() => {
    setLogFrameRef(innerRef.current);
  }, [setLogFrameRef]);

  // 常に最新のログが見えるよう一番下までスクロールする。
  useEffect(() => {
    const el = innerRef.current;
    if (el !== null) {
      el.scrollTop = el.scrollHeight;
    }
    // logData が更新される度に実行させたいため、依存に入れる。
  }, [logData]);

  const handleFocus = useCallback(
    (e: FocusEvent) => {
      e.stopPropagation();
      setScope('LogFrame');
    },
    [setScope],
  );

  return (
    <div ref={divRef} className="logFrame" tabIndex={-1} onFocus={handleFocus}>
      <div ref={innerRef} className="logFrame_inner">
        {logData.map(({ level, log, uid }) => (
          <div key={uid} className="logFrame_log" data-level={level}>
            {log === '' ? '[empty]' : log}
          </div>
        ))}
      </div>
    </div>
  );
};

export const LogFrame = memo(LogFrameComponent);
