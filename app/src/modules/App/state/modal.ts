import { atomWithReset } from 'jotai/utils';

import type { JSX } from 'react';

/**
 * モーダル要素。
 */
export const $modal = atomWithReset<JSX.Element | null>(null);
