import { atom } from 'jotai';
import { loadable } from 'jotai/utils';
import { useMemo } from 'react';
import { Ws } from '@libs/ws';

import type { Atom } from 'jotai';
import type { Loadable } from 'jotai/vanilla/utils/loadable';

/**
 * WebSocket サーバーに接続する。
 *
 * @param port - WebSocket サーバーのポート番号
 * @return jotai の atom (loadable)
 *   サーバーへの接続完了を待つためだけに使用する。
 *   実際に WebSocket を使用する際は @libs/ws の Ws を使う。
 */
export function useWebSocket(port: number): Atom<Loadable<Promise<typeof Ws>>> {
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
