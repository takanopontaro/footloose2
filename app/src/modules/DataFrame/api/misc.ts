import { RESET } from 'jotai/utils';
import mime from 'mime';
import { readState, writeState } from '@libs/utils';
import { $activeFrame, $config } from '@modules/App/state';
import {
  getActiveEntryName,
  getTargetEntryNames,
} from '@modules/DataFrame/api';
import { handleWsSendError, wsSend } from '@modules/DataFrame/libs';
import {
  $activeEntryName,
  $currentDir,
  $filteredEntries,
  $filterQuery,
  $matchMode,
  $modes,
} from '@modules/DataFrame/state';
import { writeLog } from '@modules/LogFrame/api';

import type { WsSuccessResponse } from '@modules/App/types';

/**
 * gallery モードに入る。
 *
 * @param frame - 対象フレーム
 */
function enterGalleryMode(frame = readState($activeFrame)): void {
  writeState($modes(frame), (prev) => [...prev, 'gallery']);
}

/**
 * gallery モードを終了する。
 *
 * @param frame - 対象フレーム
 */
function exitGalleryMode(frame = readState($activeFrame)): void {
  writeState($modes(frame), (prev) => prev.filter((m) => m !== 'gallery'));
}

/**
 * gallery モードをトグルする。
 *
 * @param frame - 対象フレーム
 */
function toggleGalleryMode(frame = readState($activeFrame)): void {
  writeState($modes(frame), (prev) =>
    prev.includes('gallery')
      ? prev.filter((m) => m !== 'gallery')
      : [...prev, 'gallery'],
  );
}

/**
 * マッチモードを normal にする。
 *
 * @param frame - 対象フレーム
 */
function setNormalMatchMode(frame = readState($activeFrame)): void {
  writeState($matchMode(frame), 'normal');
}

/**
 * マッチモードを regex にする。
 *
 * @param frame - 対象フレーム
 */
function setRegexMatchMode(frame = readState($activeFrame)): void {
  writeState($matchMode(frame), 'regex');
}

/**
 * マッチモードを migemo にする。
 *
 * @param frame - 対象フレーム
 */
function setMigemoMatchMode(frame = readState($activeFrame)): void {
  writeState($matchMode(frame), 'migemo');
}

/**
 * マッチモードを循環させる。
 * normal → regex → migemo → normal、の順。
 *
 * @param frame - 対象フレーム
 */
function cycleMatchMode(frame = readState($activeFrame)): void {
  const mode = readState($matchMode(frame));
  switch (mode) {
    case 'normal':
      setRegexMatchMode(frame);
      break;
    case 'regex':
      setMigemoMatchMode(frame);
      break;
    case 'migemo':
      setNormalMatchMode(frame);
      break;
  }
}

/**
 * EntryFilter をクリアする。
 *
 * @param frame - 対象フレーム
 */
function clearEntryFilter(frame = readState($activeFrame)): void {
  writeState($filterQuery(frame), RESET);
}

/**
 * Config の associations を参照して、
 * そのエントリを開くのに適切なアプリ名を返す。
 *
 * @param path - エントリのパス
 * @returns アプリ名または null
 */
function getApp(path: string): null | string {
  const type = mime.getType(path);
  const { associations } = readState($config);
  for (const assoc of associations) {
    // 関数なら実行して、アプリ名の取得を試みる。
    if (typeof assoc === 'function') {
      const app = assoc(type, path);
      if (app !== null) {
        return app;
      }
      continue;
    }
    // MIME タイプまたはエントリのパスでマッチするか確認する。
    const { app, kind, pattern } = assoc;
    if (
      (kind === 'mime' && type !== null && pattern.test(type)) ||
      (kind === 'path' && pattern.test(path))
    ) {
      return app;
    }
  }
  return null;
}

/**
 * 指定したアプリでエントリを開く。
 *
 * @param path - エントリのパス
 * @param app - アプリ名
 *   省略すると Config の associations に基づいてアプリが選ばれる。
 *   候補がない場合は規定のアプリが使われる。
 * @param frame - 対象フレーム
 */
function openWith(
  path?: string,
  app?: string,
  frame = readState($activeFrame),
): void {
  path = path ?? getActiveEntryName(frame);
  if (path === '') {
    const { messages } = readState($config);
    writeLog(messages[0], 'info');
    return;
  }
  // app が undefined の場合、規定のアプリが使われる。
  app = app ?? getApp(path) ?? undefined;
  wsSend<WsSuccessResponse>(
    'open',
    { path, app },
    (resp) => handleWsSendError(resp, frame),
    frame,
  );
}

/**
 * テキストをクリップボードにコピーする。
 *
 * @param text - クリップボードにコピーするテキスト
 * @param successMsg - コピー成功時のメッセージ
 * @param errorMsg - コピー失敗時のメッセージ
 */
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

/**
 * 選択されているエントリのパスをクリップボードにコピーする。
 * 選択行がない場合はカレントエントリのパスをコピーする。
 * カレントが `..` の時は親ディレクトリのパスをコピーする。
 *
 * @param frame - 対象フレーム
 */
function copySrcPathsToClipboard(frame = readState($activeFrame)): void {
  const { messages } = readState($config);
  const curDir = readState($currentDir(frame));
  const activeEntryName = readState($activeEntryName(frame));
  const targetNames = getTargetEntryNames(frame);

  // 選択行が無く、カレントエントリが `..` の時は親ディレクトリのパスをコピーする。
  // ルートにいる場合、親はルート自身とする。
  if (targetNames.length === 0 && activeEntryName === '..') {
    const text = curDir.replace(/\/[^/]+\/?$/, '') || '/';
    copyTextToClipboard(text, messages[8], messages[9]);
    return;
  }

  const entries = readState($filteredEntries(frame));

  // 画面表示と同じエントリ順でコピーしたいが、
  // targetNames の順序がそれと一致しているとは限らないため、
  // entries (画面表示) を基準にして targetNames をソートする。
  const text = targetNames
    .sort((a, b) => {
      const indexA = entries.findIndex((e) => e.name === a);
      const indexB = entries.findIndex((e) => e.name === b);
      return indexA - indexB;
    })
    .map((n) => `${curDir}/${n}`)
    .join('\n');

  copyTextToClipboard(text, messages[8], messages[9]);
}

/**
 * カレントディレクトリのパスをクリップボードにコピーする。
 *
 * @param frame - 対象フレーム
 */
function copySrcDirPathToClipboard(frame = readState($activeFrame)): void {
  const { messages } = readState($config);
  const curDir = readState($currentDir(frame));
  copyTextToClipboard(curDir, messages[10], messages[11]);
}

export {
  enterGalleryMode,
  exitGalleryMode,
  toggleGalleryMode,
  setNormalMatchMode,
  setRegexMatchMode,
  setMigemoMatchMode,
  cycleMatchMode,
  clearEntryFilter,
  openWith,
  copySrcPathsToClipboard,
  copySrcDirPathToClipboard,
};
