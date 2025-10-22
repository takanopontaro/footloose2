import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';

import type { Frame } from '@modules/App/types';

/**
 * プレビュー要素の ref。
 * プレビューエリアの操作に使用される。
 */
export const $previewRef = atomFamily((_frame: Frame) =>
  atom<HTMLIFrameElement | HTMLVideoElement | null>(null),
);
