import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';

import type { Frame } from '@modules/App/types';

/**
 * グリッドの表示領域において、エントリ一覧を表示できる最大行数。
 * 初回読込時は、値の算出のためダミーのエントリを描画したい。
 * そのため 1 を初期値とする。
 */
export const $maxVisibleRowCount = atomFamily((_frame: Frame) => atom(1));
