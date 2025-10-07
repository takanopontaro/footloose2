import { RESET } from 'jotai/utils';
import { readState, writeState } from '@libs/utils';
import { $activeFrame, $config, $modal } from '@modules/App/state';
import { changeDir } from '@modules/DataFrame/api';
import { handleWsSendError, wsSend } from '@modules/DataFrame/libs';
import {
  $currentDir,
  $history,
  $historyCopy,
  $historyIndex,
} from '@modules/DataFrame/state';
import { writeLog } from '@modules/LogFrame/api';
import { ListModal } from '@modules/Modal/components';
import {
  $listModalAction,
  $listModalActiveEntryName,
  $listModalDataset,
} from '@modules/Modal/state';

import type { Frame, WsBookmarkResponse } from '@modules/App/types';
import type { ChangeDirOptions } from '@modules/DataFrame/types';
import type { ListModalAction } from '@modules/Modal/types';

function showAllBookmarks(frame = readState($activeFrame)): void {
  wsSend<WsBookmarkResponse>(
    'bookmark',
    { action: 'get' },
    (resp) => {
      if (handleWsSendError(resp, frame)) {
        return;
      }
      const bookmarks = resp.data;
      if (bookmarks.length === 0) {
        const { messages } = readState($config);
        writeLog(messages[1], 'info');
        return;
      }
      const dataset = bookmarks.map((v) => ({ label: v.name, value: v.path }));
      const action: ListModalAction = {
        primary: (data) => data && changeDir(data.value, frame),
        secondary: (data) => data && deleteBookmark(data.value),
      };
      writeState($listModalActiveEntryName, dataset[0].value);
      writeState($listModalDataset, dataset);
      writeState($listModalAction, action);
      writeState($modal, <ListModal tag="bookmark" />);
    },
    frame,
  );
}

function bookmarkSrcDirPath(frame = readState($activeFrame)): void {
  const dirName = readState($currentDir(frame));
  wsSend<WsBookmarkResponse>(
    'bookmark',
    { action: 'add', name: dirName, path: dirName },
    (resp) => {
      if (handleWsSendError(resp, frame)) {
        return;
      }
      const { messages } = readState($config);
      writeLog(`${messages[2]}: ${dirName}`, 'info');
    },
    frame,
  );
}

function deleteBookmark(path: string): void {
  const frame = readState($activeFrame);
  wsSend<WsBookmarkResponse>(
    'bookmark',
    { action: 'delete', path },
    (resp) => {
      if (handleWsSendError(resp)) {
        return;
      }
      const { messages } = readState($config);
      writeLog(`${messages[3]}: ${path}`, 'info');
    },
    frame,
  );
}

function navigate(
  prevIndex: number,
  path: string,
  frame: Frame,
  historyMode: boolean,
): void {
  const opts: ChangeDirOptions = {
    errorHandler: (msg) => {
      writeLog(msg, 'error');
      let history = readState($history(frame));
      history = history.filter((h) => h !== path);
      writeState($history(frame), history);
      if (history.length <= 1) {
        writeState($historyCopy(frame), RESET);
        writeState($historyIndex(frame), RESET);
        return;
      }
      let copy = readState($historyCopy(frame));
      if (copy === null) {
        return;
      }
      copy = copy.filter((h) => h !== path);
      writeState($historyCopy(frame), copy);
      const index = readState($historyIndex(frame));
      writeState(
        $historyIndex(frame),
        prevIndex < index ? prevIndex : prevIndex - 1,
      );
    },
    historyMode,
  };
  changeDir(path, frame, opts);
}

function showFullHistory(frame = readState($activeFrame)): void {
  const data = readState($history(frame));
  if (data.length === 0) {
    const { messages } = readState($config);
    writeLog(messages[4], 'info');
    return;
  }
  const dataset = data.map((v) => ({ label: v, value: v }));
  const action: ListModalAction = {
    primary: (data) => {
      if (data) {
        const index = readState($historyIndex(frame));
        navigate(index, data.value, frame, false);
      }
    },
  };
  writeState($listModalActiveEntryName, dataset[0].value);
  writeState($listModalDataset, dataset);
  writeState($listModalAction, action);
  writeState($modal, <ListModal tag="history" />);
}

function historyGo(delta: number, frame = readState($activeFrame)): void {
  const history = readState($history(frame));
  const copy = readState($historyCopy(frame));
  const index = readState($historyIndex(frame));
  const next = index + delta * -1;
  if (copy !== null && next <= 0) {
    navigate(index, copy[0], frame, false);
    return;
  }
  if (copy !== null) {
    const i = next < copy.length ? next : copy.length - 1;
    writeState($historyIndex(frame), i);
    navigate(index, copy[i], frame, true);
    return;
  }
  if (copy === null && next > 0 && history.length > 1) {
    const h = [...history];
    const i = next < h.length ? next : h.length - 1;
    writeState($historyCopy(frame), h);
    writeState($historyIndex(frame), i);
    navigate(index, h[i], frame, true);
  }
}

export {
  showAllBookmarks,
  bookmarkSrcDirPath,
  deleteBookmark,
  showFullHistory,
  historyGo,
};
