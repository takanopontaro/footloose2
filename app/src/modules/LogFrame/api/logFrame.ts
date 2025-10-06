import { RESET } from 'jotai/utils';
import { readState, writeState } from '@libs/utils';
import { $config } from '@modules/App/state';
import { $logData, $logFrameRef } from '@modules/LogFrame/state';

import type { ReactNode } from 'react';
import type { Direction } from '@modules/App/types';
import type { LogLevel } from '@modules/LogFrame/types';

// ログを書き出す。
function writeLog(log: ReactNode, level: LogLevel = 'none'): void {
  writeState($logData, { level, log });
}

// ログをすべてクリアする。
function clearAllLogs(): void {
  writeState($logData, RESET);
}

// LogFrame をスクロールする。
// スクロール量は Config の logScrollAmount に準拠する。
function scrollLogFrame(step: number): void {
  const ref = readState($logFrameRef);
  if (ref !== null) {
    const { settings } = readState($config);
    ref.scrollTop += step * settings.logScrollAmount;
  }
}

// LogFrame をページ単位でスクロールする。
function scrollByPageLogFrame(direction: Direction): void {
  const ref = readState($logFrameRef);
  if (ref !== null) {
    ref.scrollTop += ref.offsetHeight * direction;
  }
}

// LogFrame を端までスクロールする。
function scrollToEdgeLogFrame(direction: Direction): void {
  const ref = readState($logFrameRef);
  if (ref !== null) {
    ref.scrollTop = direction === 1 ? ref.scrollHeight : 0;
  }
}

export {
  writeLog,
  clearAllLogs,
  scrollLogFrame,
  scrollByPageLogFrame,
  scrollToEdgeLogFrame,
};
