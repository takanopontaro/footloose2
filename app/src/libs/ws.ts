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

/**
 * WebSocket レスポンスがリスナー型か否かを返す型ガード。
 *
 * @param resp - レスポンス
 * @return リスナー型のレスポンスか否か
 */
function isListenerResp(resp: WsResponse): resp is WsListenerResponse {
  const values = Object.values(LISTENER_STATUS) as readonly string[];
  return values.includes(resp.status);
}

class WsClass {
  /**
   * WebSocket のインスタンス。
   */
  #ws: WebSocket | null = null;

  /**
   * リスナー。
   * 継続的に監視するもの (watch など)。
   * 引数として WebSocket レスポンスが渡される。
   */
  #listeners: {
    [K in keyof ListenerRespMap]?: ((resp: ListenerRespMap[K]) => void)[];
  } = {};

  /**
   * コールバック。
   * 一度限りの単発もの (command など)。
   * 引数として WebSocket レスポンスが渡される。
   */
  #callbacks = new Map<string, (resp: unknown) => void>();

  /**
   * 初期化する。
   *
   * @param ws - WebSocket のインスタンス
   * @return 自分自身のインスタンス
   */
  init(ws: WebSocket): WsClass {
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

  /**
   * リスナーを登録する。
   *
   * @param status - WebSocket レスポンスのステータス
   * @param listener - 登録するリスナー関数
   */
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

  /**
   * リスナーを実行する。
   *
   * @param status - WebSocket レスポンスのステータス
   * @param resp - WebSocket レスポンス
   */
  #execListener<S extends keyof ListenerRespMap>(
    status: S,
    resp: ListenerRespMap[S],
  ): void {
    const listeners = this.#listeners[status];
    if (listeners) {
      listeners.forEach((fn) => fn(resp));
    }
  }

  /**
   * リスナーを削除する。
   *
   * @param status - WebSocket レスポンスのステータス
   * @param listener - 削除するリスナー関数
   */
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

  /**
   * WebSocket サーバーにデータを送信する。
   * id を発行し、それをキーにしてコールバックを登録してから送る。
   * 受信時は、その id がレスポンスに含まれているため、コールバックを取得できる。
   *
   * @param data - 送信するデータ
   * @param callback - 登録するコールバック関数
   */
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

const ws = new WsClass();

export type { WsSendCallback };
export { ws as Ws, LISTENER_STATUS };
