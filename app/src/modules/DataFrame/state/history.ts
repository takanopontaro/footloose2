import { atomFamily, atomWithStorage } from 'jotai/utils';

import type { Frame } from '@modules/App/types';

/**
 * 履歴一覧。
 * これまで表示したディレクトリのパス一覧である。
 */
export const $history = atomFamily((frame: Frame) =>
  atomWithStorage<string[]>(`history:${frame}`, [], undefined, {
    getOnInit: true,
  }),
);
