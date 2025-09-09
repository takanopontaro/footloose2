import { RESET } from 'jotai/utils';
import { readState, writeState } from '@libs/utils';
import { $config } from '@modules/App/state';
import { $logData, $logFrameRef } from '@modules/LogFrame/state';

import type { ReactNode } from 'react';
import type { Direction } from '@modules/App/types';
import type { LogLevel } from '@modules/LogFrame/types';

function writeLog(log: ReactNode, level: LogLevel = 'none'): void {
  writeState($logData, { level, log });
}

function clearAllLogs(): void {
  writeState($logData, RESET);
}

function scrollLogFrame(step: number): void {
  const ref = readState($logFrameRef);
  if (ref !== null) {
    const { settings } = readState($config);
    ref.scrollTop += step * settings.logScrollAmount;
  }
}

function scrollByPageLogFrame(direction: Direction): void {
  const ref = readState($logFrameRef);
  if (ref !== null) {
    ref.scrollTop += ref.offsetHeight * direction;
  }
}

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
