import { useAtomValue, useSetAtom } from 'jotai';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { $api, $config } from '@modules/App/state';
import { $logData, $progressTaskInfo } from '@modules/LogFrame/state';

import type { FC, MouseEvent, ReactNode } from 'react';
import type {
  LogData,
  ProgressTaskLogData,
  ProgressTaskStatus,
} from '@modules/LogFrame/types';

function isProgressTaskLog(data: LogData): data is ProgressTaskLogData {
  return data.level === 'progress';
}

type Props = {
  label: string;
  pid: string;
};

const ProgressTaskLogComponent: FC<Props> = ({ label, pid }) => {
  const [statusEl, setStatusEl] = useState<ReactNode | null>(null);
  const setLogData = useSetAtom($logData);
  const { settings } = useAtomValue($config);
  const api = useAtomValue($api);
  const info = useAtomValue($progressTaskInfo(pid));
  const timerRef = useRef(0);

  const abort = useCallback(
    (e: MouseEvent) => {
      (e.target as HTMLButtonElement).disabled = true;
      api.abortProgressTask(pid);
    },
    [api, pid],
  );

  const moveLogToEnd = useCallback(() => {
    setLogData((prev) => {
      const index = prev.findIndex(
        (d) => isProgressTaskLog(d) && d.log.props.pid === pid,
      );
      if (index === -1) {
        return prev;
      }
      const copy = [...prev];
      const [data] = copy.splice(index, 1);
      copy.push(data);
      return copy;
    });
  }, [pid, setLogData]);

  const finishLog = useCallback(
    (status: ProgressTaskStatus) => {
      setLogData((prev) =>
        prev.filter((d) => !isProgressTaskLog(d) || d.log.props.pid !== pid),
      );
      const isFailure = status === 'error' || status === 'abort';
      const level = isFailure ? 'error' : 'info';
      const text = isFailure ? status : 'done';
      setLogData({ level, log: `${label} ... ${text}` });
    },
    [label, pid, setLogData],
  );

  useEffect(() => {
    if (info.status === 'progress') {
      setStatusEl(
        <button
          aria-label="abort"
          className="progressTaskLog_abort"
          type="button"
          onClick={abort}
        />,
      );
    } else {
      clearTimeout(timerRef.current);
      finishLog(info.status);
    }
  }, [abort, finishLog, info.status]);

  useEffect(() => {
    if (info.status !== 'progress') {
      return;
    }
    timerRef.current = window.setTimeout(
      moveLogToEnd,
      settings.progressTaskLogInterval,
    );
    return () => {
      clearTimeout(timerRef.current);
      $progressTaskInfo.remove(pid);
    };
  }, [settings.progressTaskLogInterval, info.status, moveLogToEnd, pid]);

  if (info === null) {
    return null;
  }

  return (
    <div className="progressTaskLog" data-status={info.status}>
      <div className="progressTaskLog_label">{label}</div>
      <div className="progressTaskLog_track">
        <div
          className="progressTaskLog_bar"
          style={{ width: `${info.progress}%` }}
        />
      </div>
      <div className="progressTaskLog_status">{statusEl}</div>
    </div>
  );
};

export const ProgressTaskLog = memo(ProgressTaskLogComponent);
