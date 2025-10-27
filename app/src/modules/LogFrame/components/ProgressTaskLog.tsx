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

/**
 * そのログデータが ProgressTask のものか否かを返す型ガード。
 *
 * @param data - ログデータ
 * @return ProgressTask のものか否か
 */
function isProgressTaskLog(data: LogData): data is ProgressTaskLogData {
  return data.level === 'progress';
}

/**
 * ProgressTaskLog コンポーネントの props。
 */
type Props = {
  /**
   * 表示ラベル。
   */
  label: string;
  /**
   * プロセス ID。
   */
  pid: string;
};

/**
 * ProgressTask のログを表示するコンポーネント。
 * プログレスバーや中止ボタンが付いている。
 * 他のログに紛れて画面外に流れて行ってしまわないよう一定間隔で最新位置に移動する。
 */
const ProgressTaskLogComponent: FC<Props> = ({ label, pid }) => {
  const [statusEl, setStatusEl] = useState<ReactNode | null>(null);
  const setLogData = useSetAtom($logData);
  const { settings } = useAtomValue($config);
  const api = useAtomValue($api);
  const info = useAtomValue($progressTaskInfo(pid));
  const timerRef = useRef(0);

  // 自身を最新の位置に移動する。
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

  // 一定時間後に moveLogToEnd を実行する。
  // その際、自身がアンマウントされる。
  // 開発時は useEffect が二度実行されるため、念のためクリーンアップしておく。
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
    };
  }, [settings.progressTaskLogInterval, info.status, moveLogToEnd, pid]);

  // ProgressTask をキャンセルする。
  const abort = useCallback(
    (e: MouseEvent) => {
      (e.target as HTMLButtonElement).disabled = true;
      api.abortProgressTask(pid);
    },
    [api, pid],
  );

  // 最終ログを出力し、既存のログは消す。
  const finishLog = useCallback(
    (status: ProgressTaskStatus) => {
      setLogData((prev) =>
        prev.filter((d) => !isProgressTaskLog(d) || d.log.props.pid !== pid),
      );
      const isFailure = status === 'error' || status === 'abort';
      const level = isFailure ? 'error' : 'info';
      const text = isFailure ? status : 'done';
      // プレーンなログ。ProgressTaskLog ではない。
      setLogData({ level, log: `${label} ... ${text}` });
    },
    [label, pid, setLogData],
  );

  // status が progress の時は中止ボタンを表示し、
  // それ以外になったら finishLog を実行する。
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
      $progressTaskInfo.remove(pid);
    }
  }, [abort, finishLog, info.status, pid]);

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
