import { atom } from 'jotai';

import type * as jsmigemo from 'jsmigemo';

const migemoAtom = atom<jsmigemo.Migemo | null>(null);

/**
 * Migemo インスタンス。
 */
export const $migemo = atom(
  (get) => {
    const migemo = get(migemoAtom);
    if (!migemo) {
      throw new Error('Migemo is not initialized');
    }
    return migemo;
  },
  (_get, set, newVal: jsmigemo.Migemo) => set(migemoAtom, newVal),
);
