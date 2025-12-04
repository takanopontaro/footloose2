import { RESET } from 'jotai/utils';
import { readState, writeState } from '@libs/utils';
import { $activeFrame, $config, $inactiveFrame } from '@modules/App/state';
import {
  changeDir,
  getActiveEntryName,
  getTargetEntryNames,
} from '@modules/DataFrame/api';
import {
  getPrevDirName,
  isCommandErrorResp,
  isErrorResp,
  wsSend,
} from '@modules/DataFrame/libs';
import {
  $activeEntryName,
  $currentDir,
  $rawEntries,
  $selectedEntryNames,
  $virtualDirInfo,
} from '@modules/DataFrame/state';
import { writeLog } from '@modules/LogFrame/api';

import type {
  WsCdResponse,
  WsResponse,
  WsVcpSkippedResponse,
} from '@modules/App/types';
import type { VirtualDirKind } from '@modules/DataFrame/types';

/**
 * 仮想ディレクトリの外に出たか否かを返す。
 * 出た場合、エラーコード E006002 のレスポンスが WebSocket サーバーから返ってくる。
 *
 * @param resp - サーバーからのレスポンス
 * @returns 仮想ディレクトリの外に出たか否か
 */
function isOutsideRoot(resp: WsResponse): boolean {
  return isErrorResp(resp) && resp.data.code === 'E006002';
}

/**
 * 仮想エントリのコピーがスキップされたか否かを返す型ガード。
 * スキップされたエントリがある場合は、
 * ステータスコード SKIPPED のレスポンスが WebSocket サーバーから返ってくる。
 *
 * @param resp - サーバーからのレスポンス
 * @returns コピーがスキップされたか否か
 */
function isCopySkipped(resp: WsResponse): resp is WsVcpSkippedResponse {
  return resp.status === 'SKIPPED';
}

/**
 * 仮想ディレクトリの種類 (アーカイブ形式) を取得する。
 * 対応している形式は zip, tar, tgz (tar.gz) のみっつ。
 *
 * @param path - アーカイブのパス
 * @returns 仮想ディレクトリの種類。未対応形式の場合は undefined。
 */
function getVirtualDirKindFromExt(path: string): VirtualDirKind | undefined {
  const matches = path.match(/\.(zip|tar|tgz|tar\.gz)$/);
  if (!matches) {
    return;
  }
  const kind = matches[1] === 'tar.gz' ? 'tgz' : matches[1];
  return kind as VirtualDirKind;
}

/**
 * 仮想ディレクトリを変更する。
 *
 * @param path - 移動先ディレクトリのパスまたはエントリ名
 *   まだ仮想ディレクトリに入っていない場合は、
 *   初期化のため、アーカイブへのパスを指定する必要がある。
 *   すでに入っている場合は仮想ディレクトリ内のパスを指定できる。
 * @param kind - 仮想ディレクトリの種類 (アーカイブ形式)
 * @param frame - 対象フレーム
 */
function changeVirtualDir(
  path?: string,
  kind?: VirtualDirKind,
  frame = readState($activeFrame),
): void {
  const { messages, settings } = readState($config);
  path = path ?? getActiveEntryName(frame, true);

  if (path === '') {
    writeLog(`${frame}: ${messages[0]}`, 'info');
    return;
  }

  let vdInfo = readState($virtualDirInfo(frame));

  // $virtualDirInfo が null ということは、
  // これから仮想ディレクトリに入ろうとしているということだから、
  // $virtualDirInfo を初期化する。
  if (!vdInfo) {
    const curDir = readState($currentDir(frame));
    const archive = path.startsWith('/') ? path : `${curDir}/${path}`;
    kind = kind ?? getVirtualDirKindFromExt(archive);
    if (!kind) {
      writeLog(`${frame}: ${messages[12]}`, 'info');
      return;
    }
    vdInfo = { archive, kind };
    writeState($virtualDirInfo(frame), vdInfo);
  }

  wsSend<WsCdResponse>(
    'cvd',
    {
      kind: vdInfo.kind,
      archive: vdInfo.archive,
      path,
      filter: settings.virtualDirExcludePattern,
    },
    (resp) => {
      // path が仮想ディレクトリ外なら、通常の changeDir を呼び出す。
      if (isOutsideRoot(resp)) {
        changeDir(path, frame);
        return;
      }
      // エラー時はホームディレクトリに移動する。
      if (isErrorResp(resp) || isCommandErrorResp(resp)) {
        writeLog(resp.data.msg, 'error');
        changeDir('~', frame);
        return;
      }
      const { entries, path: p } = resp.data;
      // foo/bar というツリーを考える。
      // 今 bar にいるとして、親 (foo) に上がった時、prevDirName は bar になる。
      // 親子関係がないところに移動した場合は null になる。
      const prevDirName = getPrevDirName(p, frame);
      writeState($currentDir(frame), p);
      writeState($rawEntries(frame), entries);
      writeState(
        $activeEntryName(frame),
        // 今までいたエントリ (ディレクトリ) をカレントエントリにする。
        prevDirName === null ? RESET : prevDirName,
      );
      writeState($selectedEntryNames(frame), RESET);
    },
    frame,
  );
}

/**
 * 親の仮想ディレクトリに移動する。
 *
 * @param frame - 対象フレーム
 */
function goToParentVirtualDir(frame = readState($activeFrame)): void {
  const vdInfo = readState($virtualDirInfo(frame));
  if (!vdInfo) {
    return;
  }
  const curDir = readState($currentDir(frame));
  changeVirtualDir(`${curDir}/..`, vdInfo.kind, frame);
}

/**
 * 選択した仮想エントリを実ディレクトリにコピーする。
 * まだ仮想ディレクトリに入っていない場合は何も起きない。
 *
 * @param paths - コピーする仮想エントリのパス配列
 * @param frame - 対象フレーム
 */
function extractSelectedEntries(
  paths?: string[],
  frame = readState($activeFrame),
): void {
  paths = paths ?? getTargetEntryNames(frame);

  if (paths.length === 0) {
    const { messages } = readState($config);
    writeLog(`${frame}: ${messages[0]}`, 'info');
    return;
  }

  const vdInfo = readState($virtualDirInfo(frame));
  if (!vdInfo) {
    return;
  }

  // コピー先のパス (非アクティブなフレームのカレントディレクトリ)
  const destination = readState($currentDir(readState($inactiveFrame)));

  wsSend<WsCdResponse | WsVcpSkippedResponse>(
    'vcp',
    { kind: vdInfo.kind, archive: vdInfo.archive, sources: paths, destination },
    (resp) => {
      // スキップされたエントリがある場合はログに出す。
      if (isCopySkipped(resp)) {
        const { messages } = readState($config);
        writeLog(`${frame}: ${messages[13]}: ${resp.data.join(', ')}`, 'warn');
        return;
      }
      if (isErrorResp(resp) || isCommandErrorResp(resp)) {
        writeLog(resp.data.msg, 'error');
        return;
      }
    },
    frame,
  );
}

export {
  getVirtualDirKindFromExt,
  changeVirtualDir,
  goToParentVirtualDir,
  extractSelectedEntries,
};
