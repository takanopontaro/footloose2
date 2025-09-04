import { atom } from 'jotai';
import { loadable } from 'jotai/utils';
import { useMemo } from 'react';
import { Ws } from '@libs/ws';

import type { Atom } from 'jotai';
import type { Loadable } from 'jotai/vanilla/utils/loadable';

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
