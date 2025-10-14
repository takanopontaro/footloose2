import { readState } from '@libs/utils';
import { $activeFrame } from '@modules/App/state';
import { getTargetNames } from '@modules/DataFrame/api';
import {
  getOtherFrame,
  handleWsSendError,
  wsSend,
} from '@modules/DataFrame/libs';
import { $currentDir } from '@modules/DataFrame/state';
import { writeLog } from '@modules/LogFrame/api';
import { ProgressTaskLog } from '@modules/LogFrame/components';

import type {
  WsDataResponse,
  WsProgressTaskResponse,
  WsSuccessResponse,
} from '@modules/App/types';
import type {
  ProgressTaskCallback,
  ShTaskCallback,
} from '@modules/DataFrame/types';

/**
 * ProgressTask を実行する。
 *
 * @param callback - コールバック関数
 *   対象エントリの配列、コピー元ディレクトリ、コピー先ディレクトリを受け取り、
 *   ProgressTaskCallbackResult を返す。
 * @param frame - 対象フレーム
 */
async function runProgressTask(
  callback: ProgressTaskCallback,
  frame = readState($activeFrame),
): Promise<void> {
  const targetNames = getTargetNames(frame);
  if (targetNames.length === 0) {
    return;
  }

  const srcDir = readState($currentDir(frame));
  const destDir = readState($currentDir(getOtherFrame(frame)));

  const info = await callback(targetNames, srcDir, destDir);
  if (!info) {
    return;
  }

  wsSend<WsProgressTaskResponse>(
    'progress',
    {
      sources: info.src,
      destination: info.dest,
      config: { cmd: info.cmd, total: info.total },
    },
    (resp) => {
      if (handleWsSendError(resp, frame)) {
        return;
      }
      const log = <ProgressTaskLog label={info.label} pid={resp.data.pid} />;
      writeLog(log, 'progress');
    },
    frame,
  );
}

/**
 * ProgressTask を中止する。
 *
 * @param pid - ProgressTask のプロセス ID
 * @param frame - 対象フレーム
 */
function abortProgressTask(pid: string, frame = readState($activeFrame)): void {
  wsSend<WsSuccessResponse>(
    'kill',
    { pid },
    // handleWsSendError に frame は渡さなくてよい。
    // ProgressTask は非同期タスクなため、
    // 実行時と中止時とで $activeFrame が変わっている可能性があるため。
    // abortProgressTask の frame 引数を必須にするという手もあるが、
    // 呼び出し元の負担が増えるためやらないことにした。
    (resp) => handleWsSendError(resp),
    frame,
  );
}

/**
 * ShTask を実行する。
 *
 * @param callback - コールバック関数
 *   対象エントリの配列、コピー元ディレクトリ、コピー先ディレクトリを受け取り、
 *   ShTaskCallbackResult を返す。
 * @param frame - 対象フレーム
 */
async function runShTask(
  callback: ShTaskCallback,
  frame = readState($activeFrame),
): Promise<void> {
  // ShTask は対象エントリの有る無しにかかわらず実行できるため、
  // length のチェックはしない。
  const targetNames = getTargetNames(frame);

  const srcDir = readState($currentDir(frame));
  const destDir = readState($currentDir(getOtherFrame(frame)));

  const info = await callback(targetNames, srcDir, destDir);
  if (!info) {
    return;
  }

  wsSend<WsDataResponse>(
    'sh',
    {
      sources: info.src,
      destination: info.dest,
      config: { cmd: info.cmd },
    },
    (resp) => {
      if (handleWsSendError(resp, frame)) {
        return;
      }
      writeLog(info.log, 'info');
    },
    frame,
  );
}

export { runProgressTask, abortProgressTask, runShTask };
