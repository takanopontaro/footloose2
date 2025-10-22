import { atomWithReset } from 'jotai/utils';

/**
 * モーダル要素の ref。
 * dialog 要素を指す。
 */
export const $modalRef = atomWithReset<HTMLElement | null>(null);
