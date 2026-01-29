import { atomFamily, atomWithStorage } from 'jotai/utils';

import type { Frame } from '@modules/App/types';

/**
 * 前セッションの最終カレントディレクトリ。
 * 新しいセッションの初期ディレクトリとして使用する。
 */
export const $prevSessionDir = atomFamily((frame: Frame) =>
  atomWithStorage(`prevSessionDir:${frame}`, '~', undefined, {
    getOnInit: true,
  }),
);
