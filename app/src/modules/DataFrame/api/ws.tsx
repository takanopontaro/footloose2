import { get } from '@libs/utils';
import { $activeFrame, $inactiveFrame } from '@modules/App/state';
import { getTargetNames } from '@modules/DataFrame/api';
import { handleWsSendError, wsSend } from '@modules/DataFrame/libs';
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

async function runProgressTask(callback: ProgressTaskCallback): Promise<void> {
  const frame = get($activeFrame);
  const names = getTargetNames(frame);
  if (names.length === 0) {
    return;
  }
  const srcDir = get($currentDir(frame));
  const destDir = get($currentDir(get($inactiveFrame)));
  const config = await callback(names, srcDir, destDir);
  if (config === null) {
    return;
  }
  wsSend<WsProgressTaskResponse>(
    'progress',
    {
      sources: config.src,
      destination: config.dest,
      config: { cmd: config.cmd, total: config.total },
    },
    (resp) => {
      if (handleWsSendError(resp, frame)) {
        return;
      }
      const log = <ProgressTaskLog label={config.label} pid={resp.data.pid} />;
      writeLog(log, 'progress');
    },
    frame,
  );
}

function abortProgressTask(pid: string, frame = get($activeFrame)): void {
  wsSend<WsSuccessResponse>(
    'kill',
    { pid },
    (resp) => handleWsSendError(resp, frame),
    frame,
  );
}

async function runShTask(callback: ShTaskCallback): Promise<void> {
  const frame = get($activeFrame);
  const names = getTargetNames(frame);
  const srcDir = get($currentDir(frame));
  const destDir = get($currentDir(get($inactiveFrame)));
  const config = await callback(names, srcDir, destDir);
  if (config === null) {
    return;
  }
  wsSend<WsDataResponse>(
    'sh',
    {
      sources: config.src,
      destination: config.dest,
      config: { cmd: config.cmd },
    },
    (resp) => {
      if (handleWsSendError(resp, frame)) {
        return;
      }
      writeLog(config.log, 'info');
    },
    frame,
  );
}

export { runProgressTask, abortProgressTask, runShTask };
