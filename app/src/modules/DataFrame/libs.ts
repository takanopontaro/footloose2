import { cycleIndex, get } from '@libs/utils';
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

function getOtherFrame(frame: Frame): Frame {
  return frame === 'a' ? 'b' : 'a';
}

function getPrevName(newDirName: string, frame: Frame): null | string {
  const prevDirName = get($currentDir(frame));
  if (prevDirName === newDirName || !prevDirName.startsWith(newDirName)) {
    return null;
  }
  const matches = prevDirName.match(/[^/]+$/);
  return matches ? matches[0] : null;
}

function calcTotalCells(totalItems: number, colCount: number): number {
  const mod = totalItems % colCount;
  return mod === 0 ? totalItems : totalItems + (colCount - mod);
}

function calcGridIndex(
  curIndex: number,
  delta: number,
  direction: CursorDirection,
  totalItems: number,
  colCount: number,
): number {
  let newIndex = curIndex + delta;
  if (direction === 'left' || direction === 'right') {
    const curRowStartIndex = curIndex - (curIndex % colCount);
    if (newIndex < curRowStartIndex) {
      return curRowStartIndex;
    }
    const curRowEndIndex = curRowStartIndex + colCount - 1;
    if (newIndex > curRowEndIndex) {
      return curRowEndIndex;
    }
    return newIndex;
  }
  const mod = newIndex % colCount;
  if (newIndex < 0) {
    return mod === 0 ? 0 : mod + colCount;
  }
  const maxIndex = totalItems - 1;
  if (newIndex > maxIndex) {
    const totalCells = calcTotalCells(totalItems, colCount);
    const lastRowStartIndex = totalCells - colCount;
    newIndex = lastRowStartIndex + mod;
    return newIndex <= maxIndex ? newIndex : maxIndex;
  }
  return newIndex;
}

// インデックスを循環させる
// 最小値を下回ると最大値に、最大値を上回ると最小値に戻る
function cycleGridIndex(
  curIndex: number,
  delta: number,
  direction: CursorDirection,
  totalItems: number,
  totalCells: number,
): number {
  const newIndex = cycleIndex(curIndex, delta, totalCells);
  if (newIndex < totalItems) {
    return newIndex;
  }
  switch (direction) {
    case 'up':
    case 'left':
    case 'down':
      return totalItems - 1;
    case 'right':
      return 0;
  }
}

function wsSend<R extends WsResponse>(
  command: string,
  args: Record<string, unknown>,
  callback: WsSendCallback<R>,
  frame: Frame,
): void {
  const ws = get($ws);
  const dirName = get($currentDir(frame));
  ws.send<R>({ frame, cwd: dirName, name: command, args }, callback);
}

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

function isErrorResp(resp: WsResponse): resp is WsErrorResponse {
  return resp.status === 'ERROR';
}

function isCommandErrorResp(resp: WsResponse): resp is WsCommandErrorResponse {
  return resp.status === 'COMMAND_ERROR';
}

export {
  getPrevName,
  getOtherFrame,
  calcTotalCells,
  calcGridIndex,
  cycleGridIndex,
  wsSend,
  handleWsSendError,
  isErrorResp,
  isCommandErrorResp,
};
