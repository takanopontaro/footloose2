import { RESET } from 'jotai/utils';
import { get, set } from '@libs/utils';
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
  frame = get($activeFrame),
  historyMode = false,
  errorHandler?: (msg: string) => void,
): void {
  path = path ?? getTargetName(frame, true);
  if (path === '') {
    const { messages } = get($config);
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
      set($virtualDirInfo(frame), RESET);
      const { entries, path } = resp.data;
      const prevName = getPrevName(path, frame);
      set($currentDir(frame), path);
      set($filteredEntries(frame), entries);
      set($activeEntryName(frame), prevName === null ? RESET : prevName);
      set($selectedEntryNames(frame), RESET);
      if (!historyMode) {
        set($historyCopy(frame), RESET);
        set($historyIndex(frame), RESET);
      }
    },
    frame,
  );
}

function goToParentDir(frame = get($activeFrame)): void {
  const dirName = get($currentDir(frame));
  changeDir(`${dirName}/..`, frame);
}

function goToDir(frame = get($activeFrame)): void {
  const action: PromptModalAction = {
    primary(data) {
      data = data.trim();
      if (data === '') {
        const { messages } = get($config);
        writeLog(messages[5], 'warn');
        return;
      }
      changeDir(data, frame);
    },
  };
  set($promptModalData, RESET);
  set($promptModalAction, action);
  set($modal, <PromptModal />);
}

function syncDestDirPathWithSrcDirPath(frame = get($activeFrame)): void {
  const otherFrame = getOtherFrame(frame);
  const dirName = get($currentDir(frame));
  const vd = get($virtualDirInfo(frame));
  if (vd === null) {
    changeDir(dirName, otherFrame);
    return;
  }
  set($virtualDirInfo(otherFrame), vd);
  changeVirtualDir(dirName, vd.kind, otherFrame);
}

function syncSrcDirPathWithDestDirPath(frame = get($activeFrame)): void {
  const otherFrame = getOtherFrame(frame);
  const dirName = get($currentDir(otherFrame));
  const vd = get($virtualDirInfo(otherFrame));
  if (vd === null) {
    changeDir(dirName, frame);
    return;
  }
  set($virtualDirInfo(frame), vd);
  changeVirtualDir(dirName, vd.kind, frame);
}

function swapDirPaths(): void {
  const frame = get($activeFrame);
  const otherFrame = getOtherFrame(frame);
  const dirName = get($currentDir(frame));
  const otherDirName = get($currentDir(otherFrame));
  const vd = get($virtualDirInfo(frame));
  const otherVd = get($virtualDirInfo(otherFrame));
  if (otherVd === null) {
    changeDir(otherDirName, frame);
  } else {
    set($virtualDirInfo(frame), otherVd);
    changeVirtualDir(otherDirName, otherVd.kind, frame);
  }
  if (vd === null) {
    changeDir(dirName, otherFrame);
  } else {
    set($virtualDirInfo(otherFrame), vd);
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
