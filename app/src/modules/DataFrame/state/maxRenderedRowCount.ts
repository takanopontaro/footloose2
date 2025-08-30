import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import type { Frame } from '@modules/App/types';

// 初回読込時は maxRenderedRowCount 算出のため dummyEntry を描画する。
// そのため 1 を初期値とする。
export const $maxRenderedRowCount = atomFamily((_frame: Frame) => atom(1));
