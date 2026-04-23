import { atom } from 'jotai';

import type { DirUpdateSubscriptionRecord } from '@modules/DataFrame/types';

/**
 * ディレクトリが更新された時に実行されるコールバック情報の一覧。
 */
export const $dirUpdateSubscriptionRecords = atom<
  DirUpdateSubscriptionRecord[]
>([]);
