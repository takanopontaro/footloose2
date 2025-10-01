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

// 型ガード
// リスナー型のレスポンスかどうかを返す。
function isListenerResp(resp: WsResponse): resp is WsListenerResponse {
  const values = Object.values(LISTENER_STATUS) as readonly string[];
  return values.includes(resp.status);
}

class Ws {
  // WebSocket のインスタンス
  #ws: WebSocket | null = null;

  // リスナー
  // 継続的に監視するもの (watch など)
  #listeners: {
    [K in keyof ListenerRespMap]?: ((resp: ListenerRespMap[K]) => void)[];
  } = {};

  // コールバック
  // 一度限りの単発もの (command など)
  #callbacks = new Map<string, (resp: unknown) => void>();

  init(ws: WebSocket): Ws {
    this.#ws = ws;
    ws.addEventListener('message', (e: MessageEvent<string>) => {
      const resp = JSON.parse(e.data) as WsResponse;
      // リスナーを実行する。
      if (isListenerResp(resp)) {
        this.#execListener(resp.status, resp);
        return;
      }
      // コールバックを実行し、消去する。
      const fn = this.#callbacks.get(resp.cid);
      if (fn) {
        this.#callbacks.delete(resp.cid);
        fn(resp);
      }
    });
    return this;
  }

  // リスナーを登録する。
  registerListener<S extends keyof ListenerRespMap>(
    status: S,
    listener: (resp: ListenerRespMap[S]) => void,
  ): void {
    if (!this.#ws) {
      throw new Error('WebSocket is not initialized');
    }
    // こう書きたかったが、[] が never[] 型になってしまうため断念した。
    // const arr = this.#listeners[status] ?? [];
    // arr.push(listener);
    if (!this.#listeners[status]) {
      this.#listeners[status] = [];
    }
    this.#listeners[status].push(listener);
  }

  // リスナーを実行する。
  #execListener<S extends keyof ListenerRespMap>(
    status: S,
    resp: ListenerRespMap[S],
  ): void {
    const listeners = this.#listeners[status];
    if (listeners) {
      listeners.forEach((fn) => fn(resp));
    }
  }

  // リスナーを削除する。
  removeListener<S extends keyof ListenerRespMap>(
    status: S,
    listener: (resp: ListenerRespMap[S]) => void,
  ): void {
    if (!this.#ws) {
      throw new Error('WebSocket is not initialized');
    }
    const arr = this.#listeners[status];
    if (!arr) {
      return;
    }
    const index = arr.findIndex((l) => l === listener) ?? -1;
    if (index !== -1) {
      arr.splice(index, 1);
    }
  }

  // WebSocket サーバーにデータを送信する。
  // id を発行し、それをキーとしてコールバックを登録してから送る。
  // 受信時、その id がレスポンスに含まれているため、コールバックを取得できる。
  send<R extends WsResponse>(
    data: Omit<WsCommand, 'id'>,
    callback: WsSendCallback<R>,
  ): void {
    if (!this.#ws) {
      throw new Error('WebSocket is not initialized');
    }
    const id = crypto.randomUUID();
    // このキャストは仕方がない。
    this.#callbacks.set(id, callback as (resp: unknown) => void);
    const msg = JSON.stringify({ ...data, id });
    this.#ws.send(msg);
  }
}

const ws = new Ws();

export type { WsSendCallback };
export { ws as Ws, LISTENER_STATUS };
