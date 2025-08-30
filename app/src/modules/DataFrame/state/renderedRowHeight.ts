import { getCssVariable } from '@libs/utils';
import { atom } from 'jotai';

export const $renderedRowHeight = atom(() =>
  parseInt(getCssVariable('--row-height')),
);
