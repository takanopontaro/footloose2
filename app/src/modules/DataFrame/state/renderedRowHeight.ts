import { atom } from 'jotai';
import { getCssVariable } from '@libs/utils';

/**
 * レンダリングされた時の行の高さ。
 * グリッドの表示領域関連の計算に使用される。
 */
export const $renderedRowHeight = atom(() =>
  parseInt(getCssVariable('--row-height')),
);
