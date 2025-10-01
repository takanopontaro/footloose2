import { cycleIndex, readState } from '@libs/utils';
import { $ws } from '@modules/App/state';
import { $currentDir } from '@modules/DataFrame/state';
import { writeLog } from '@modules/LogFrame/api';

import type { WsSendCallback } from '@libs/ws';
import type {
  Frame,
  WsCommandErrorResponse,
  WsErrorResponse,
  WsResponse,
} from '@modules/App/types';
import type { CursorDirection } from '@modules/DataFrame/types';

// 対になるフレームを返す。
function getOtherFrame(frame: Frame): Frame {
  return frame === 'a' ? 'b' : 'a';
}

// 今まで滞在していたディレクトリの名前を返す。
// 一階層上に移動した際に、今までいたディレクトリを選択状態にするために使用する。
// 実際に移動する「前」にコールする。移動先は引数として渡す。
function getPrevDirName(newCurDir: string, frame: Frame): null | string {
  const prevCurDir = readState($currentDir(frame));
  // 移動先が親ディレクトリでなかったら return する。
  if (prevCurDir === newCurDir || !prevCurDir.startsWith(newCurDir)) {
    return null;
  }
  // エントリー名を抽出する。
  const matches = prevCurDir.match(/[^/]+$/);
  return matches ? matches[0] : null;
}

// エントリーの総数とグリッドの列数から、グリッドの総セル数を計算する。
// 以下だと、エントリー数は 10 で、総セル数は 12 になる。
// +----+----+----+----+
// |  0 |  1 |  2 |  3 |
// +----+----+----+----+
// |  4 |  5 |  6 |  7 |
// +----+----+----+----+
// |  8 |  9 |    |    |
// +----+----+----+----+
function calcTotalCells(totalEntries: number, colCount: number): number {
  const mod = totalEntries % colCount;
  return mod === 0 ? totalEntries : totalEntries + (colCount - mod);
}

// カーソルの移動方向に基づいて、グリッド内の次のインデックスを計算する。
// ループはしない。例えばカレントが 6 の時、移動量と移動先の関係は以下の通り。
// 上に 1 → 2 / 2 → 2
// 右に 1 → 7 / 2 → 7
// 下に 1 → 9 / 2 → 9
// 左に 1 → 5 / 2 → 4 / 3 → 4
// +----+----+----+----+
// |  0 |  1 |  2 |  3 |
// +----+----+----+----+
// |  4 |  5 |  * |  7 |
// +----+----+----+----+
// |  8 |  9 |    |    |
// +----+----+----+----+
function calcGridIndex(
  curIndex: number,
  delta: number,
  direction: CursorDirection,
  totalEntries: number,
  colCount: number,
): number {
  let newIndex = curIndex + delta;

  // 左右移動の場合
  if (direction === 'left' || direction === 'right') {
    // カレント行の、始まり (左端) のインデックス
    const curRowStartIndex = curIndex - (curIndex % colCount);
    if (newIndex < curRowStartIndex) {
      return curRowStartIndex;
    }
    // カレント行の、終わり (右端) のインデックス
    const curRowEndIndex = curRowStartIndex + colCount - 1;
    if (newIndex > curRowEndIndex) {
      return curRowEndIndex;
    }
    return newIndex;
  }

  // 上移動で、次のインデックスがマイナスの場合、同列一行目に移動する。
  if (newIndex < 0) {
    const mod = newIndex % colCount;
    return mod === 0 ? 0 : mod + colCount;
  }

  // 下移動で、次のインデックスが総エントリー数を超えた場合、同列最終行に移動する。
  // ただし、そこにエントリーが無い場合は、最終エントリーに移動する。
  const maxIndex = totalEntries - 1;
  if (newIndex > maxIndex) {
    const totalCells = calcTotalCells(totalEntries, colCount);
    const lastRowStartIndex = totalCells - colCount;
    newIndex = lastRowStartIndex + (newIndex % colCount);
    return newIndex <= maxIndex ? newIndex : maxIndex;
  }

  return newIndex;
}

// カーソルの移動方向に基づいて、グリッド内の次のインデックスを計算する。
// ループする。例えばカレントが 6 の時、移動量と移動先の関係は以下の通り。
// 上に 1 → 2 / 2 → 9 (10 が無いため)
// 右に 1 → 7 / 2 → 8 (下の段に行く)
// 下に 1 → 9 (10 が無いため) / 2 → 2 (10 → 2 という動きをする)
// 左に 1 → 5 / 2 → 4 / 3 → 3 (上の段に行く)
// +----+----+----+----+
// |  0 |  1 |  2 |  3 |
// +----+----+----+----+
// |  4 |  5 |  * |  7 |
// +----+----+----+----+
// |  8 |  9 |    |    |
// +----+----+----+----+
function cycleGridIndex(
  curIndex: number,
  delta: number,
  direction: CursorDirection,
  totalItems: number,
  totalCells: number,
): number {
  // グリッドなので totalItems ではなく totalCells を基準に循環させる。
  const newIndex = cycleIndex(curIndex, delta, totalCells);
  if (newIndex < totalItems) {
    return newIndex;
  }
  // 移動先にエントリーが無い場合、ここに入る。
  // (コメントのグリッドで言うと、10, 11 の時)
  // カーソルの移動方向に基づいて、新しい移動先を決める。
  switch (direction) {
    case 'up':
    case 'left':
    case 'down':
      return totalItems - 1;
    case 'right':
      return 0;
  }
}

// 型ガード
// WebSocket のレスポンスが汎用エラーかどうかを返す。
function isErrorResp(resp: WsResponse): resp is WsErrorResponse {
  return resp.status === 'ERROR';
}

// 型ガード
// WebSocket のレスポンスがコマンドエラーかどうかを返す。
// リクエスト時の引数の間違いなどに起因する。
function isCommandErrorResp(resp: WsResponse): resp is WsCommandErrorResponse {
  return resp.status === 'COMMAND_ERROR';
}

// WebSocket のリクエストを発行する。
// レスポンスは callback で受け取る。
function wsSend<R extends WsResponse>(
  command: string,
  args: Record<string, unknown>,
  callback: WsSendCallback<R>,
  frame: Frame,
): void {
  const ws = readState($ws);
  const curDir = readState($currentDir(frame));
  ws.send<R>({ frame, cwd: curDir, name: command, args }, callback);
}

// WebSocket のエラーレスポンスを処理する。
// 型ガードも兼ねている。
function handleWsSendError(
  resp: WsResponse,
  frame?: Frame,
): resp is WsCommandErrorResponse | WsErrorResponse {
  if (isErrorResp(resp) || isCommandErrorResp(resp)) {
    const prefix = frame ? `${frame}: ` : '';
    writeLog(`${prefix}${resp.data.msg}`, 'error');
    return true;
  }
  return false;
}

export {
  getPrevDirName,
  getOtherFrame,
  calcTotalCells,
  calcGridIndex,
  cycleGridIndex,
  isErrorResp,
  isCommandErrorResp,
  wsSend,
  handleWsSendError,
};
