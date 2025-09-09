import { RESET } from 'jotai/utils';
import { readState, writeState } from '@libs/utils';
import { $activeFrame, $config, $modal } from '@modules/App/state';
import { changeVirtualDir, getTargetName } from '@modules/DataFrame/api';
import {
  getOtherFrame,
  getPrevName,
  isCommandErrorResp,
  isErrorResp,
  wsSend,
} from '@modules/DataFrame/libs';
import {
  $activeEntryName,
  $currentDir,
  $filteredEntries,
  $historyCopy,
  $historyIndex,
  $selectedEntryNames,
  $virtualDirInfo,
} from '@modules/DataFrame/state';
import { writeLog } from '@modules/LogFrame/api';
import { PromptModal } from '@modules/Modal/components';
import { $promptModalAction, $promptModalData } from '@modules/Modal/state';

import type { WsCdResponse } from '@modules/App/types';
import type { PromptModalAction } from '@modules/Modal/types';

function changeDir(
  path?: string,
  frame = readState($activeFrame),
  historyMode = false,
  errorHandler?: (msg: string) => void,
): void {
  path = path ?? getTargetName(frame, true);
  if (path === '') {
    const { messages } = readState($config);
    writeLog(`${frame}: ${messages[0]}`, 'info');
    return;
  }
  if (!errorHandler) {
    errorHandler = (msg: string) => {
      writeLog(msg, 'error');
      changeDir('~', frame);
    };
  }
  wsSend<WsCdResponse>(
    'cd',
    { path },
    (resp) => {
      if (isErrorResp(resp) || isCommandErrorResp(resp)) {
        errorHandler(resp.data.msg);
        return;
      }
      writeState($virtualDirInfo(frame), RESET);
      const { entries, path } = resp.data;
      const prevName = getPrevName(path, frame);
      writeState($currentDir(frame), path);
      writeState($filteredEntries(frame), entries);
      writeState($activeEntryName(frame), prevName === null ? RESET : prevName);
      writeState($selectedEntryNames(frame), RESET);
      if (!historyMode) {
        writeState($historyCopy(frame), RESET);
        writeState($historyIndex(frame), RESET);
      }
    },
    frame,
  );
}

function goToParentDir(frame = readState($activeFrame)): void {
  const dirName = readState($currentDir(frame));
  changeDir(`${dirName}/..`, frame);
}

function goToDir(frame = readState($activeFrame)): void {
  const action: PromptModalAction = {
    primary(data) {
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

function syncDestDirPathWithSrcDirPath(frame = readState($activeFrame)): void {
  const otherFrame = getOtherFrame(frame);
  const dirName = readState($currentDir(frame));
  const vd = readState($virtualDirInfo(frame));
  if (vd === null) {
    changeDir(dirName, otherFrame);
    return;
  }
  writeState($virtualDirInfo(otherFrame), vd);
  changeVirtualDir(dirName, vd.kind, otherFrame);
}

function syncSrcDirPathWithDestDirPath(frame = readState($activeFrame)): void {
  const otherFrame = getOtherFrame(frame);
  const dirName = readState($currentDir(otherFrame));
  const vd = readState($virtualDirInfo(otherFrame));
  if (vd === null) {
    changeDir(dirName, frame);
    return;
  }
  writeState($virtualDirInfo(frame), vd);
  changeVirtualDir(dirName, vd.kind, frame);
}

function swapDirPaths(): void {
  const frame = readState($activeFrame);
  const otherFrame = getOtherFrame(frame);
  const dirName = readState($currentDir(frame));
  const otherDirName = readState($currentDir(otherFrame));
  const vd = readState($virtualDirInfo(frame));
  const otherVd = readState($virtualDirInfo(otherFrame));
  if (otherVd === null) {
    changeDir(otherDirName, frame);
  } else {
    writeState($virtualDirInfo(frame), otherVd);
    changeVirtualDir(otherDirName, otherVd.kind, frame);
  }
  if (vd === null) {
    changeDir(dirName, otherFrame);
  } else {
    writeState($virtualDirInfo(otherFrame), vd);
    changeVirtualDir(dirName, vd.kind, otherFrame);
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
