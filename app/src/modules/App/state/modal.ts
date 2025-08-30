import { atomWithReset } from 'jotai/utils';
import type { JSX } from 'react';

export const $modal = atomWithReset<JSX.Element | null>(null);
