import type { ComponentProps, ReactElement, ReactNode } from 'react';
import type { ProgressTaskLog } from '@modules/LogFrame/components';

/**
 * ログレベル。
 */
export type LogLevel = 'error' | 'info' | 'none' | 'progress' | 'warn';

/**
 * ログデータ。
 */
export type LogData = {
  /**
   * ログレベル。
   */
  level: LogLevel;
  /**
   * ログの内容。
   */
  log: ReactNode;
  /**
   * ユニーク ID。
   */
  uid: string;
};

/**
 * ProgressTask のログデータ。
 */
export type ProgressTaskLogData = {
  /**
   * ログレベル。
   */
  level: 'progress';
  /**
   * ログの内容。
   * ProgressTaskLog コンポーネントに限定される。
   */
  log: ReactElement<ComponentProps<typeof ProgressTaskLog>>;
  /**
   * ユニーク ID。
   */
  uid: string;
};

/**
 * ProgressTask のステータス。
 */
export type ProgressTaskStatus = 'abort' | 'end' | 'error' | 'progress';

/**
 * ProgressTask の詳細情報。
 */
export type ProgressTaskInfo = {
  /**
   * プロセス ID。
   */
  pid: string;
  /**
   * 進捗率 (百分率)。
   */
  progress: number;
  /**
   * ステータス。
   */
  status: ProgressTaskStatus;
};
