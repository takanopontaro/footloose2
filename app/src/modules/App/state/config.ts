import { atom } from 'jotai';

import type { Config } from '@modules/App/types';

const configAtom = atom<Config | null>(null);

/**
 * アプリケーションの設定情報。
 */
export const $config = atom(
  (get) => {
    const config = get(configAtom);
    if (!config) {
      throw new Error('Config is not initialized');
    }
    return config;
  },
  (_get, set, newVal: Config) => set(configAtom, newVal),
);
