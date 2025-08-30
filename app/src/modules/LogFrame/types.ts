import type { ProgressTaskLog } from '@modules/LogFrame/components';
import type { ComponentProps, ReactElement, ReactNode } from 'react';

export type LogLevel = 'error' | 'info' | 'none' | 'progress' | 'warn';

export type LogData = {
  level: LogLevel;
  log: ReactNode;
  uid: string;
};

export type ProgressTaskLogData = {
  level: 'progress';
  log: ReactElement<ComponentProps<typeof ProgressTaskLog>>;
  uid: string;
};

export type ProgressTaskStatus = 'abort' | 'end' | 'error' | 'progress';

export type ProgressTaskInfo = {
  pid: string;
  progress: number;
  status: ProgressTaskStatus;
};
