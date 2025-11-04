import { RESET } from 'jotai/utils';
import { readState, writeState } from '@libs/utils';
import { $activeFrame, $config, $modal } from '@modules/App/state';
import { changeVirtualDir, getActiveEntryName } from '@modules/DataFrame/api';
import {
  getOtherFrame,
  getPrevDirName,
  isCommandErrorResp,
  isErrorResp,
  wsSend,
} from '@modules/DataFrame/libs';
import {
  $activeEntryName,
  $currentDir,
  $historyCopy,
  $historyIndex,
  $rawEntries,
  $selectedEntryNames,
  $virtualDirInfo,
} from '@modules/DataFrame/state';
import { writeLog } from '@modules/LogFrame/api';
import { PromptModal } from '@modules/Modal/components';
import { $promptModalAction, $promptModalData } from '@modules/Modal/state';

import type { WsCdResponse } from '@modules/App/types';
import type { ChangeDirOptions } from '@modules/DataFrame/types';
import type { PromptModalAction } from '@modules/Modal/types';

/**
 * ディレクトリを変更する。
 *
 * @param path - 移動先ディレクトリのパスまたはエントリ名
 * @param frame - 対象フレーム
 */
function changeDir(
  path?: string,
  frame = readState($activeFrame),
  options?: ChangeDirOptions,
): void {
  path = path ?? getActiveEntryName(frame, true);

  if (path === '') {
    const { messages } = readState($config);
    writeLog(`${frame}: ${messages[0]}`, 'info');
    return;
  }

  const opts: Required<ChangeDirOptions> = {
    errorHandler: (msg) => writeLog(msg, 'error'),
    historyMode: false,
    ...options,
  };

  wsSend<WsCdResponse>(
    'cd',
    { path },
    (resp) => {
      if (isErrorResp(resp) || isCommandErrorResp(resp)) {
        opts.errorHandler(resp.data.msg);
        return;
      }
      const { entries, path } = resp.data;
      // foo/bar というツリーを考える。
      // 今 bar にいるとして、親 (foo) に上がった時、prevDirName は bar になる。
      // 親子関係がないところに移動した場合は null になる。
      const prevDirName = getPrevDirName(path, frame);
      writeState($virtualDirInfo(frame), RESET);
      writeState($currentDir(frame), path);
      writeState($rawEntries(frame), entries);
      writeState(
        $activeEntryName(frame),
        // 今までいたエントリ (ディレクトリ) をカレントエントリにする。
        prevDirName === null ? RESET : prevDirName,
      );
      writeState($selectedEntryNames(frame), RESET);
      if (!opts.historyMode) {
        writeState($historyCopy(frame), RESET);
        writeState($historyIndex(frame), RESET);
      }
    },
    frame,
  );
}

/**
 * 親ディレクトリに移動する。
 *
 * @param frame - 対象フレーム
 */
function goToParentDir(frame = readState($activeFrame)): void {
  const curDir = readState($currentDir(frame));
  changeDir(`${curDir}/..`, frame);
}

/**
 * 任意のディレクトリに移動する。
 *
 * @param frame - 対象フレーム
 */
function goToDir(frame = readState($activeFrame)): void {
  const action: PromptModalAction = {
    primary: (data) => {
      data = data.trim();
      if (data === '') {
        const { messages } = readState($config);
        writeLog(messages[5], 'warn');
        return;
      }
      changeDir(data, frame);
    },
  };
  writeState($promptModalData, RESET);
  writeState($promptModalAction, action);
  writeState($modal, <PromptModal />);
}

/**
 * 相手フレームのディレクトリパスを自フレームと同じにする。
 *
 * @param frame - 対象フレーム
 */
function syncDestDirPathWithSrcDirPath(frame = readState($activeFrame)): void {
  const otherFrame = getOtherFrame(frame);
  const curDir = readState($currentDir(frame));
  const vd = readState($virtualDirInfo(frame));
  if (!vd) {
    changeDir(curDir, otherFrame);
    return;
  }
  writeState($virtualDirInfo(otherFrame), vd);
  changeVirtualDir(curDir, vd.kind, otherFrame);
}

/**
 * 自フレームのディレクトリパスを相手フレームと同じにする。
 *
 * @param frame - 対象フレーム
 */
function syncSrcDirPathWithDestDirPath(frame = readState($activeFrame)): void {
  const otherFrame = getOtherFrame(frame);
  const otherCurDir = readState($currentDir(otherFrame));
  const vd = readState($virtualDirInfo(otherFrame));
  if (!vd) {
    changeDir(otherCurDir, frame);
    return;
  }
  writeState($virtualDirInfo(frame), vd);
  changeVirtualDir(otherCurDir, vd.kind, frame);
}

/**
 * 自フレームと相手フレームのディレクトリパスを入れ替える。
 */
function swapDirPaths(): void {
  const frame = readState($activeFrame);
  const otherFrame = getOtherFrame(frame);
  const curDir = readState($currentDir(frame));
  const otherCurDir = readState($currentDir(otherFrame));
  const vd = readState($virtualDirInfo(frame));
  const otherVd = readState($virtualDirInfo(otherFrame));
  if (!otherVd) {
    changeDir(otherCurDir, frame);
  } else {
    writeState($virtualDirInfo(frame), otherVd);
    changeVirtualDir(otherCurDir, otherVd.kind, frame);
  }
  if (!vd) {
    changeDir(curDir, otherFrame);
  } else {
    writeState($virtualDirInfo(otherFrame), vd);
    changeVirtualDir(curDir, vd.kind, otherFrame);
  }
}

export {
  changeDir,
  goToParentDir,
  goToDir,
  syncDestDirPathWithSrcDirPath,
  syncSrcDirPathWithDestDirPath,
  swapDirPaths,
};
