import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import type { ProgressTaskInfo } from '@modules/LogFrame/types';

export const $progressTaskInfo = atomFamily((pid: string) =>
  atom<ProgressTaskInfo>({ pid, progress: 0, status: 'progress' }),
);
