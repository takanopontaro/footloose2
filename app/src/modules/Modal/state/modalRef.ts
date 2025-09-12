import { atomWithReset } from 'jotai/utils';

export const $modalRef = atomWithReset<HTMLElement | null>(null);
