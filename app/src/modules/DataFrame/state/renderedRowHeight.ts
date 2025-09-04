import { atom } from 'jotai';
import { getCssVariable } from '@libs/utils';

export const $renderedRowHeight = atom(() =>
  parseInt(getCssVariable('--row-height')),
);
