import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';

import type { ProgressTaskInfo } from '@modules/LogFrame/types';

/**
 * ProgressTask の詳細情報。
 */
export const $progressTaskInfo = atomFamily((pid: string) =>
  atom<ProgressTaskInfo>({ pid, progress: 0, status: 'progress' }),
);
