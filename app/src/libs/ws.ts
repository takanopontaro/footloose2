import type {
  WsCommand,
  WsCommandErrorResponse,
  WsErrorResponse,
  WsListenerResponse,
  WsResponse,
} from '@modules/App/types';

type WsSendCallback<R extends WsResponse> = (
  resp: R | WsCommandErrorResponse | WsErrorResponse,
) => void;

type ListenerRespMap = {
  [R in WsListenerResponse as R['status']]: R;
};

const LISTENER_STATUS = {
  progress: 'PROGRESS',
  progressError: 'PROGRESS_ERROR',
  progressEnd: 'PROGRESS_END',
  progressAbort: 'PROGRESS_ABORT',
  dirUpdate: 'DIR_UPDATE',
  watchError: 'WATCH_ERROR',
} as const;

function isListenerResp(resp: WsResponse): resp is WsListenerResponse {
  const values = Object.values(LISTENER_STATUS) as readonly string[];
  return values.includes(resp.status);
}

class Ws {
  #ws: WebSocket | null = null;

  // watch などの常時監視用途
  #listeners: {
    [K in keyof ListenerRespMap]?: ((resp: ListenerRespMap[K]) => void)[];
  } = {};

  // command などの単発系用途
  #callbacks = new Map<string, (resp: unknown) => void>();

  init(ws: WebSocket): Ws {
    this.#ws = ws;
    ws.addEventListener('message', (e: MessageEvent<string>) => {
      const resp = JSON.parse(e.data) as WsResponse;
      if (isListenerResp(resp)) {
        this.#execListener(resp.status, resp);
        return;
      }
      const fn = this.#callbacks.get(resp.cid);
      if (fn !== undefined) {
        this.#callbacks.delete(resp.cid);
        fn(resp);
      }
    });
    return this;
  }

  #execListener<S extends keyof ListenerRespMap>(
    status: S,
    resp: ListenerRespMap[S],
  ): void {
    const listeners = this.#listeners[status];
    if (listeners !== undefined) {
      listeners.forEach((fn) => fn(resp));
    }
  }

  send<R extends WsResponse>(
    data: Omit<WsCommand, 'id'>,
    callback: WsSendCallback<R>,
  ): void {
    if (this.#ws === null) {
      throw new Error('WebSocket is not initialized');
    }
    const id = crypto.randomUUID();
    // このキャストは仕方がない。
    this.#callbacks.set(id, callback as (resp: unknown) => void);
    const msg = JSON.stringify({ ...data, id });
    this.#ws.send(msg);
  }

  registerListener<S extends keyof ListenerRespMap>(
    status: S,
    listener: (resp: ListenerRespMap[S]) => void,
  ): void {
    if (this.#ws === null) {
      throw new Error('WebSocket is not initialized');
    }
    // こう書きたかったが、[] が never[] 型になってしまうため断念した。
    // const arr = this.#listeners[status] ?? [];
    // arr.push(listener);
    if (this.#listeners[status] === undefined) {
      this.#listeners[status] = [];
    }
    this.#listeners[status].push(listener);
  }

  removeListener<S extends keyof ListenerRespMap>(
    status: S,
    listener: (resp: ListenerRespMap[S]) => void,
  ): void {
    if (this.#ws === null) {
      throw new Error('WebSocket is not initialized');
    }
    const arr = this.#listeners[status];
    const index = arr?.findIndex((l) => l === listener) ?? -1;
    if (index !== -1) {
      arr?.splice(index, 1);
    }
  }
}

const ws = new Ws();

export type { WsSendCallback };
export { ws as Ws, LISTENER_STATUS };
