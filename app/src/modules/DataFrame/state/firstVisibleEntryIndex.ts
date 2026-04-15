import { atom } from 'jotai';
import { atomFamily } from 'jotai-family';

import type { Frame } from '@modules/App/types';

/**
 * グリッドの表示領域において、先頭に表示されるエントリのインデックス。
 */
export const $firstVisibleEntryIndex = atomFamily((_frame: Frame) => atom(0));
