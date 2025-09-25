import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';

import type { Frame } from '@modules/App/types';

// 初回読込時は、値の算出のためダミーのエントリーを描画したい。
// そのため 1 を初期値とする。
export const $maxVisibleRowCount = atomFamily((_frame: Frame) => atom(1));
