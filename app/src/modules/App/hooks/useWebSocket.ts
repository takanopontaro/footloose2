import { atom } from 'jotai';
import { unwrap } from 'jotai/utils';
import { useMemo } from 'react';
import { Ws } from '@libs/ws';

import type { Atom } from 'jotai';

// Jotai の loadable が deprecated になり、v3 で削除予定のため、
// 公式で紹介されている実装に差し替えた。
// https://github.com/pmndrs/jotai/pull/3217

type Loadable<T> =
  | { data: T; state: 'hasData' }
  | { error: unknown; state: 'hasError' }
  | { state: 'loading' };

function loadable<T>(anAtom: Atom<Promise<T>>): Atom<Loadable<T>> {
  const LOADING = { state: 'loading' } as const;
  const unwrappedAtom = unwrap(anAtom, () => LOADING);
  return atom((get) => {
    try {
      const data = get(unwrappedAtom);
      if (data === LOADING) {
        return LOADING;
      }
      return { state: 'hasData', data: data as T };
    } catch (error) {
      return { state: 'hasError', error };
    }
  });
}

/**
 * WebSocket サーバーに接続する。
 *
 * @param port - WebSocket サーバーのポート番号
 * @returns jotai の atom (loadable)
 *   サーバーへの接続完了を待つためだけに使用する。
 *   実際に WebSocket を使用する際は @libs/ws の Ws を使う。
 */
export function useWebSocket(port: number): Atom<Loadable<typeof Ws>> {
  return useMemo(() => {
    const atm = atom<Promise<typeof Ws>>(
      () =>
        new Promise((resolve, reject) => {
          const ws = new WebSocket(`ws://localhost:${port}/ws`);
          ws.addEventListener('open', () => resolve(Ws.init(ws)));
          ws.addEventListener('error', () => reject(new Error()));
        }),
    );
    return loadable(atm);
  }, [port]);
}
