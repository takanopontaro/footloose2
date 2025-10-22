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
  ProgressTaskArgsGenerator,
  ShTaskArgsGenerator,
} from '@modules/DataFrame/types';

/**
 * ProgressTask を実行する。
 *
 * @param generator - ProgressTask に渡す引数を生成する関数
 *   対象エントリの配列、ソースディレクトリ、出力先ディレクトリを受け取り、
 *   ProgressTaskArgs を返す。
 * @param frame - 対象フレーム
 */
async function runProgressTask(
  generator: ProgressTaskArgsGenerator,
  frame = readState($activeFrame),
): Promise<void> {
  const targetNames = getTargetNames(frame);
  if (targetNames.length === 0) {
    return;
  }

  const srcDir = readState($currentDir(frame));
  const destDir = readState($currentDir(getOtherFrame(frame)));

  const args = await generator(targetNames, srcDir, destDir);
  if (!args) {
    return;
  }

  wsSend<WsProgressTaskResponse>(
    'progress',
    {
      sources: args.src,
      destination: args.dest,
      config: { cmd: args.cmd, total: args.total },
    },
    (resp) => {
      if (handleWsSendError(resp, frame)) {
        return;
      }
      const log = <ProgressTaskLog label={args.label} pid={resp.data.pid} />;
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
 * @param generator - ShTask に渡す引数を生成する関数
 *   対象エントリの配列、ソースディレクトリ、出力先ディレクトリを受け取り、
 *   ShTaskArgs を返す。
 * @param frame - 対象フレーム
 */
async function runShTask(
  generator: ShTaskArgsGenerator,
  frame = readState($activeFrame),
): Promise<void> {
  // ShTask は対象エントリの有る無しにかかわらず実行できるため、
  // length のチェックはしない。
  const targetNames = getTargetNames(frame);

  const srcDir = readState($currentDir(frame));
  const destDir = readState($currentDir(getOtherFrame(frame)));

  const args = await generator(targetNames, srcDir, destDir);
  if (!args) {
    return;
  }

  wsSend<WsDataResponse>(
    'sh',
    {
      sources: args.src,
      destination: args.dest,
      config: { cmd: args.cmd },
    },
    (resp) => {
      if (handleWsSendError(resp, frame)) {
        return;
      }
      writeLog(args.log, 'info');
    },
    frame,
  );
}

export { runProgressTask, abortProgressTask, runShTask };
