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

/**
 * ブックマーク一覧を表示する。
 * ブックマークを選択するとそのディレクトリに移動する。
 *
 * @param frame - 対象フレーム
 */
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

/**
 * カレントディレクトリをブックマークする。
 *
 * @param frame - 対象フレーム
 */
function bookmarkCurrentDir(frame = readState($activeFrame)): void {
  const curDir = readState($currentDir(frame));
  wsSend<WsBookmarkResponse>(
    'bookmark',
    { action: 'add', name: curDir, path: curDir },
    (resp) => {
      if (handleWsSendError(resp, frame)) {
        return;
      }
      const { messages } = readState($config);
      writeLog(`${messages[2]}: ${curDir}`, 'info');
    },
    frame,
  );
}

/**
 * ブックマークを削除する。
 *
 * @param path - 削除するブックマークのパス
 */
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

/**
 * ディレクトリを変更する。
 * 移動に失敗した時 (ディレクトリが存在しない等) は履歴情報が適切に調整される。
 *
 * @param prevHistoryIndex - ひとつ前の履歴インデックス
 * @param path - 移動先のパス
 * @param frame - 対象フレーム
 * @param historyMode - history-mode で移動するか否か
 */
function navigate(
  prevHistoryIndex: number,
  path: string,
  frame: Frame,
  historyMode: boolean,
): void {
  const opts: ChangeDirOptions = {
    errorHandler: (msg) => {
      writeLog(msg, 'error');

      // エラーの場合、その履歴は無効と判断し、削除する。
      let history = readState($history(frame));
      history = history.filter((h) => h !== path);
      writeState($history(frame), history);

      // 履歴がひとつ以下なら history-mode を解除して return する。
      if (history.length <= 1) {
        writeState($historyCopy(frame), RESET);
        writeState($historyIndex(frame), RESET);
        return;
      }

      let copy = readState($historyCopy(frame));
      if (!copy) {
        return;
      }

      // 無効な履歴をコピーからも削除する。
      copy = copy.filter((h) => h !== path);
      writeState($historyCopy(frame), copy);

      // 履歴のインデックスを調整する。
      // 移動に成功する前提で、既に $historyIndex は更新されている (curIndex)。
      // しかし失敗して履歴が削除されたため、インデックスの調整が必要になる。
      // ひとつ前のインデックス (prevHistoryIndex) と curIndex を比較して、
      // 適切なインデックスを設定する。
      const curIndex = readState($historyIndex(frame));
      writeState(
        $historyIndex(frame),
        prevHistoryIndex < curIndex ? prevHistoryIndex : prevHistoryIndex - 1,
      );
    },
    historyMode,
  };
  changeDir(path, frame, opts);
}

/**
 * 履歴一覧を表示する。
 * 履歴を選択するとそのディレクトリに移動する。
 * history-mode にはしない。
 *
 * @param frame - 対象フレーム
 */
function showFullHistory(frame = readState($activeFrame)): void {
  const history = readState($history(frame));
  if (history.length === 0) {
    const { messages } = readState($config);
    writeLog(messages[4], 'info');
    return;
  }
  const dataset = history.map((v) => ({ label: v, value: v }));
  const action: ListModalAction = {
    primary: (data) => {
      if (data) {
        const curIndex = readState($historyIndex(frame));
        navigate(curIndex, data.value, frame, false);
      }
    },
  };
  writeState($listModalActiveEntryName, dataset[0].value);
  writeState($listModalDataset, dataset);
  writeState($listModalAction, action);
  writeState($modal, <ListModal tag="history" />);
}

/**
 * 履歴を移動する。
 *
 * @param delta - 移動量
 * @param frame - 対象フレーム
 */
function historyGo(delta: number, frame = readState($activeFrame)): void {
  const history = readState($history(frame));
  const copy = readState($historyCopy(frame));
  const curIndex = readState($historyIndex(frame));
  const nextIndex = curIndex + delta * -1;

  // コピーがあるということは、現在 history-mode であることを意味する。
  // 履歴を行ったり来たりしている状態。

  // history-mode かつ次のインデックスがゼロ以下なら、移動しつつモードを解除する。
  if (copy && nextIndex <= 0) {
    navigate(curIndex, copy[0], frame, false);
    return;
  }

  // インデックスを更新して、モードを保ったまま移動する。
  // インデックスはループさせない。
  if (copy) {
    const i = nextIndex < copy.length ? nextIndex : copy.length - 1;
    writeState($historyIndex(frame), i);
    navigate(curIndex, copy[i], frame, true);
    return;
  }

  // コピーがない場合、それを作って history-mode に入ってから移動する。
  // ただし履歴が一個以下の場合は何もしない。
  if (nextIndex > 0 && history.length > 1) {
    const h = [...history];
    const i = nextIndex < h.length ? nextIndex : h.length - 1;
    writeState($historyCopy(frame), h);
    writeState($historyIndex(frame), i);
    navigate(curIndex, h[i], frame, true);
  }
}

export {
  showAllBookmarks,
  bookmarkCurrentDir,
  deleteBookmark,
  showFullHistory,
  historyGo,
};
