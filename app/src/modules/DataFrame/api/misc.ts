import { get, set } from '@libs/utils';
import { $activeFrame, $config, $modes } from '@modules/App/state';
import { getTargetName, getTargetNames } from '@modules/DataFrame/api';
import { handleWsSendError, wsSend } from '@modules/DataFrame/libs';
import {
  $activeEntryName,
  $currentDir,
  $filterQuery,
  $filteredEntries,
} from '@modules/DataFrame/state';
import { writeLog } from '@modules/LogFrame/api';
import { RESET } from 'jotai/utils';
import type { WsSuccessResponse } from '@modules/App/types';

function enterGalleryMode(frame = get($activeFrame)): void {
  set($modes(frame), (prev) => [...prev, 'gallery']);
}

function exitGalleryMode(frame = get($activeFrame)): void {
  set($modes(frame), (prev) => prev.filter((m) => m !== 'gallery'));
}

function clearEntryFilter(frame = get($activeFrame)): void {
  set($filterQuery(frame), RESET);
}

function openWith(
  path?: string,
  app?: string,
  frame = get($activeFrame),
): void {
  path = path ?? getTargetName(frame);
  if (path === '') {
    const { messages } = get($config);
    writeLog(messages[0], 'info');
    return;
  }
  wsSend<WsSuccessResponse>(
    'open',
    { path, app },
    (resp) => handleWsSendError(resp, frame),
    frame,
  );
}

function copyTextToClipboard(
  text: string,
  successMsg: string,
  errorMsg: string,
): void {
  navigator.clipboard
    .writeText(text)
    .then(() => writeLog(successMsg, 'info'))
    .catch((e) => writeLog(`${errorMsg}: ${e}`, 'error'));
}

function copySrcPathsToClipboard(frame = get($activeFrame)): void {
  const { messages } = get($config);
  const names = getTargetNames(frame);
  const curName = get($activeEntryName(frame));
  if (names.length === 0 && curName !== '..') {
    writeLog(messages[0], 'info');
    return;
  }
  const dirName = get($currentDir(frame));
  if (names.length === 0 && curName === '..') {
    const text = dirName.replace(/\/[^/]+\/?$/, '') || '/';
    copyTextToClipboard(text, messages[8], messages[9]);
    return;
  }
  const entries = get($filteredEntries(frame));
  const text = names
    .sort((a, b) => {
      const indexA = entries.findIndex((e) => e.name === a);
      const indexB = entries.findIndex((e) => e.name === b);
      return indexA - indexB;
    })
    .map((n) => `${dirName}/${n}`)
    .join('\n');
  copyTextToClipboard(text, messages[8], messages[9]);
}

function copySrcDirPathToClipboard(frame = get($activeFrame)): void {
  const { messages } = get($config);
  const dirName = get($currentDir(frame));
  copyTextToClipboard(dirName, messages[10], messages[11]);
}

export {
  enterGalleryMode,
  exitGalleryMode,
  clearEntryFilter,
  openWith,
  copySrcPathsToClipboard,
  copySrcDirPathToClipboard,
};
