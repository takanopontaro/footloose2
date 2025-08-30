import { get, set } from '@libs/utils';
import { $config } from '@modules/App/state';
import { $logData, $logFrameRef } from '@modules/LogFrame/state';
import { RESET } from 'jotai/utils';
import type { Direction } from '@modules/App/types';
import type { LogLevel } from '@modules/LogFrame/types';
import type { ReactNode } from 'react';

function writeLog(log: ReactNode, level: LogLevel = 'none'): void {
  set($logData, { level, log });
}

function clearAllLogs(): void {
  set($logData, RESET);
}

function scrollLogFrame(step: number): void {
  const ref = get($logFrameRef);
  if (ref !== null) {
    const { settings } = get($config);
    ref.scrollTop += step * settings.logScrollAmount;
  }
}

function scrollByPageLogFrame(direction: Direction): void {
  const ref = get($logFrameRef);
  if (ref !== null) {
    ref.scrollTop += ref.offsetHeight * direction;
  }
}

function scrollToEdgeLogFrame(direction: Direction): void {
  const ref = get($logFrameRef);
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
