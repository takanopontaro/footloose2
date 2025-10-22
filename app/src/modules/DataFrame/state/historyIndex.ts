import { atomFamily, atomWithReset } from 'jotai/utils';

import type { Frame } from '@modules/App/types';

/**
 * 履歴のインデックス。
 * history モード時に使用される。
 */
export const $historyIndex = atomFamily((_frame: Frame) => atomWithReset(0));
