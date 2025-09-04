import { RESET } from 'jotai/utils';
import { get, set } from '@libs/utils';
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
import type { ListModalAction } from '@modules/Modal/types';

function showAllBookmarks(frame = get($activeFrame)): void {
  wsSend<WsBookmarkResponse>(
    'bookmark',
    { action: 'get' },
    (resp) => {
      if (handleWsSendError(resp, frame)) {
        return;
      }
      const bookmarks = resp.data;
      if (bookmarks.length === 0) {
        const { messages } = get($config);
        writeLog(messages[1], 'info');
        return;
      }
      const dataset = bookmarks.map((v) => ({ label: v.name, value: v.path }));
      const action: ListModalAction = {
        primary: (data) => {
          if (data) {
            changeDir(data.value, frame, false, (msg) =>
              writeLog(msg, 'error'),
            );
          }
        },
        secondary: (data) => data && deleteBookmark(data.value),
      };
      set($listModalActiveEntryName, dataset[0].value);
      set($listModalDataset, dataset);
      set($listModalAction, action);
      set($modal, <ListModal tag="ListModal:bookmark" />);
    },
    frame,
  );
}

function bookmarkSrcDirPath(frame = get($activeFrame)): void {
  const dirName = get($currentDir(frame));
  wsSend<WsBookmarkResponse>(
    'bookmark',
    { action: 'add', name: dirName, path: dirName },
    (resp) => {
      if (handleWsSendError(resp, frame)) {
        return;
      }
      const { messages } = get($config);
      writeLog(`${messages[2]}: ${dirName}`, 'info');
    },
    frame,
  );
}

function deleteBookmark(path: string): void {
  const frame = get($activeFrame);
  wsSend<WsBookmarkResponse>(
    'bookmark',
    { action: 'delete', path },
    (resp) => {
      if (handleWsSendError(resp)) {
        return;
      }
      const { messages } = get($config);
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
  changeDir(path, frame, historyMode, (msg: string) => {
    writeLog(msg, 'error');
    let history = get($history(frame));
    history = history.filter((h) => h !== path);
    set($history(frame), history);
    if (history.length <= 1) {
      set($historyCopy(frame), RESET);
      set($historyIndex(frame), RESET);
      return;
    }
    let copy = get($historyCopy(frame));
    if (copy === null) {
      return;
    }
    copy = copy.filter((h) => h !== path);
    set($historyCopy(frame), copy);
    const index = get($historyIndex(frame));
    set($historyIndex(frame), prevIndex < index ? prevIndex : prevIndex - 1);
  });
}

function showFullHistory(frame = get($activeFrame)): void {
  const data = get($history(frame));
  if (data.length === 0) {
    const { messages } = get($config);
    writeLog(messages[4], 'info');
    return;
  }
  const dataset = data.map((v) => ({ label: v, value: v }));
  const action: ListModalAction = {
    primary: (data) => {
      if (data) {
        const index = get($historyIndex(frame));
        navigate(index, data.value, frame, false);
      }
    },
  };
  set($listModalActiveEntryName, dataset[0].value);
  set($listModalDataset, dataset);
  set($listModalAction, action);
  set($modal, <ListModal tag="ListModal:history" />);
}

function historyGo(delta: number, frame = get($activeFrame)): void {
  const history = get($history(frame));
  const copy = get($historyCopy(frame));
  const index = get($historyIndex(frame));
  const next = index + delta * -1;
  if (copy !== null && next <= 0) {
    navigate(index, copy[0], frame, false);
    return;
  }
  if (copy !== null) {
    const i = next < copy.length ? next : copy.length - 1;
    set($historyIndex(frame), i);
    navigate(index, copy[i], frame, true);
    return;
  }
  if (copy === null && next > 0 && history.length > 1) {
    const h = [...history];
    const i = next < h.length ? next : h.length - 1;
    set($historyCopy(frame), h);
    set($historyIndex(frame), i);
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
