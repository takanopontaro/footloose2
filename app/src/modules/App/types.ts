import type { LISTENER_STATUS } from '@libs/ws';
import type { Bookmark, DirData } from '@modules/DataFrame/types';
import type * as appApi from '@modules/App/api';
import type * as dataFrameApi from '@modules/DataFrame/api';
import type * as logApi from '@modules/LogFrame/api';
import type * as modalApi from '@modules/Modal/api';

/**
 * 方向を表す。
 * カーソルの移動方向などに使用する。
 */
export type Direction = -1 | 1;

/**
 * WbSocket サーバーに送信するデータ。
 */
export type WsCommand = {
  /**
   * コマンド引数。
   */
  args: Record<string, unknown>;
  /**
   * カレントディレクトリ。
   */
  cwd: string;
  /**
   * 対象フレーム。
   */
  frame: Frame;
  /**
   * コマンド ID。
   */
  id: string;
  /**
   * コマンド名。
   */
  name: string;
};

/**
 * 成功時のレスポンス。
 */
export type WsSuccessResponse = {
  /**
   * コマンド ID。
   */
  cid: string;
  /**
   * ステータス。
   */
  status: 'SUCCESS';
};

/**
 * エラー時のレスポンス。
 */
export type WsErrorResponse = {
  /**
   * コマンド ID。
   */
  cid: string;
  /**
   * エラーの詳細データ。
   */
  data: {
    /**
     * エラーコード。
     */
    code: string;
    /**
     * エラーメッセージ。
     */
    msg: string;
  };
  /**
   * ステータス。
   */
  status: 'ERROR';
};

/**
 * データの戻り値がある場合のレスポンス。
 */
export type WsDataResponse = {
  /**
   * コマンド ID。
   */
  cid: string;
  /**
   * データ。
   */
  data: string;
  /**
   * ステータス。
   */
  status: 'SUCCESS';
};

/**
 * ProgressTask のレスポンス。
 */
export type WsProgressTaskResponse = {
  /**
   * コマンド ID。
   */
  cid: string;
  /**
   * データ。
   */
  data: {
    /**
     * プロセス ID。
     */
    pid: string;
  };
  /**
   * ステータス。
   */
  status: 'PROGRESS_TASK';
};

/**
 * コマンドエラー時のレスポンス。
 */
export type WsCommandErrorResponse = {
  /**
   * コマンド ID。
   * 送られてきたコマンドをサーバーがうまく解析できなかったため、空文字である。
   */
  cid: '';
  /**
   * エラーの詳細データ。
   */
  data: {
    /**
     * エラーコード。
     */
    code: string;
    /**
     * エラーメッセージ。
     */
    msg: string;
  };
  /**
   * ステータス。
   */
  status: 'COMMAND_ERROR';
};

/**
 * cd コマンドのレスポンス。
 */
export type WsCdResponse = {
  /**
   * コマンド ID。
   */
  cid: string;
  /**
   * ディレクトリの詳細データ。
   */
  data: DirData;
  /**
   * ステータス。
   */
  status: 'SUCCESS';
};

/**
 * bookmark コマンドのレスポンス。
 */
export type WsBookmarkResponse = {
  /**
   * コマンド ID。
   */
  cid: string;
  /**
   * ブックマーク一覧。
   */
  data: Bookmark[];
  /**
   * ステータス。
   */
  status: 'SUCCESS';
};

/**
 * vcp コマンドでスキップが発生した場合のレスポンス。
 */
export type WsVcpSkippedResponse = {
  /**
   * コマンド ID。
   */
  cid: string;
  /**
   * スキップされたエントリのパス一覧。
   */
  data: string[];
  /**
   * ステータス。
   */
  status: 'SKIPPED';
};

/**
 * コマンド系のレスポンス群。
 * こちらから何かを送信して、それに対するレスポンスとして送信されてくるもの。
 */
export type WsCommandResponse =
  | WsBookmarkResponse
  | WsCdResponse
  | WsCommandErrorResponse
  | WsDataResponse
  | WsErrorResponse
  | WsProgressTaskResponse
  | WsSuccessResponse
  | WsVcpSkippedResponse;

/**
 * 進捗状況を表すレスポンス。
 * ProgressTask の場合に送信されてくる。
 */
export type WsProgressResponse = {
  /**
   * コマンド ID。
   */
  cid: string;
  /**
   * 進捗状況の詳細データ。
   */
  data: {
    /**
     * プロセス ID。
     */
    pid: string;
    /**
     * 進捗率 (0-100)。
     */
    progress: number;
  };
  /**
   * ステータス。
   */
  status: (typeof LISTENER_STATUS)['progress'];
};

/**
 * 進捗エラーを表すレスポンス。
 * ProgressTask の場合に送信されてくる。
 */
export type WsProgressErrorResponse = {
  /**
   * コマンド ID。
   */
  cid: string;
  /**
   * 進捗エラーの詳細データ。
   */
  data: {
    /**
     * エラーメッセージ。
     */
    msg: string;
    /**
     * プロセス ID。
     */
    pid: string;
  };
  /**
   * ステータス。
   */
  status: (typeof LISTENER_STATUS)['progressError'];
};

/**
 * 進捗完了を表すレスポンス。
 * ProgressTask の場合に送信されてくる。
 */
export type WsProgressEndResponse = {
  /**
   * コマンド ID。
   */
  cid: string;
  /**
   * 進捗完了の詳細データ。
   */
  data: {
    /**
     * プロセス ID。
     */
    pid: string;
  };
  /**
   * ステータス。
   */
  status: (typeof LISTENER_STATUS)['progressEnd'];
};

/**
 * 進捗中止を表すレスポンス。
 * ProgressTask の場合に送信されてくる。
 */
export type WsProgressAbortResponse = {
  /**
   * コマンド ID。
   */
  cid: string;
  /**
   * 進捗中止の詳細データ。
   */
  data: {
    /**
     * プロセス ID。
     */
    pid: string;
  };
  /**
   * ステータス。
   */
  status: (typeof LISTENER_STATUS)['progressAbort'];
};

/**
 * ディレクトリ更新を表すレスポンス。
 * 更新があると自動的に送信されてくる。
 */
export type WsDirUpdateResponse = {
  /**
   * コマンド ID。
   * 自動送信されるため、空文字である。
   */
  cid: '';
  /**
   * ディレクトリの詳細データ。
   */
  data: DirData;
  /**
   * ステータス。
   */
  status: (typeof LISTENER_STATUS)['dirUpdate'];
};

/**
 * 監視エラーを表すレスポンス。
 * 監視ディレクトリに問題が発生した場合に送信されてくる。
 * 例えば削除された場合などである。
 */
export type WsWatchErrorResponse = {
  /**
   * コマンド ID。
   * 自動送信されるため、空文字である。
   */
  cid: '';
  /**
   * 監視エラーの詳細データ。
   */
  data: {
    /**
     * エラーコード。
     */
    code: string;
    /**
     * エラーメッセージ。
     */
    msg: string;
    /**
     * 監視ディレクトリのパス。
     */
    path: string;
  };
  /**
   * ステータス。
   */
  status: (typeof LISTENER_STATUS)['watchError'];
};

/**
 * リスナー系のレスポンス群。
 * サーバーから自動的に送信されてくるもの。
 */
export type WsListenerResponse =
  | WsDirUpdateResponse
  | WsProgressAbortResponse
  | WsProgressEndResponse
  | WsProgressErrorResponse
  | WsProgressResponse
  | WsWatchErrorResponse;

/**
 * 全ての WebSocket レスポンス群。
 */
export type WsResponse = WsCommandResponse | WsListenerResponse;

/**
 * フレーム。
 */
export type Frame = 'a' | 'b';

/**
 * スコープ。
 * 空文字は初期値。
 */
export type Scope =
  | ''
  | 'ConfirmModal'
  | 'DataFrame'
  | 'EntryFilter'
  | 'ListModal'
  | 'ListModalEntryFilter'
  | 'LogFrame'
  | 'PromptModal';

/**
 * モード。
 */
export type Mode = 'filter' | 'gallery' | 'history' | 'preview' | 'virtual-dir';

/**
 * タグ。
 */
export type Tag =
  | 'ConfirmModal:cancel'
  | 'ConfirmModal:confirm'
  | 'ListModal:bookmark'
  | 'ListModal:history'
  | 'PromptModal:cancel'
  | 'PromptModal:confirm'
  | 'PromptModal:input';

/**
 * API。
 */
export type Api = typeof appApi &
  typeof dataFrameApi &
  typeof logApi &
  typeof modalApi;

/**
 * ショートカット押下で実行されるコマンド関数。
 *
 * @param api - API オブジェクト
 * @param combo - 押されたキーの組み合わせ
 *   Mousetrap に準拠する。
 *   例： `ctrl+shift+up`
 * @param args - ショートカット設定で定義された引数
 *   ShortcutCommand の args プロパティそのもの。
 */
export type CommandAction = (
  api: Api,
  combo: string,
  args?: any, // eslint-disable-line @typescript-eslint/no-explicit-any
) => Promise<void> | void;

/**
 * コマンドの設定。
 */
export type CommandsConfig = {
  /**
   * コマンド関数。
   */
  action: CommandAction;
  /**
   * コマンド名。
   * ShortcutCommand の cmd プロパティに対応する。
   */
  name: string;
}[];

/**
 * ログなどに表示される定型メッセージの設定。
 */
export type MessagesConfig = string[];

/**
 * アプリケーションの設定。
 */
export type SettingsConfig = {
  /**
   * ログフレームのスクロール量 (px)。
   */
  logScrollAmount: number;
  /**
   * 履歴の最大数。
   */
  maxHistoryCount: number;
  /**
   * ログの最大数。
   */
  maxLogCount: number;
  /**
   * プレビューエリアのスクロール量 (px)。
   */
  previewScrollAmount: number;
  /**
   * ProgressTask のログ更新間隔 (ミリ秒)。
   * このログにはプログレスバーや中止ボタンが付いているため、
   * 画面外に流れて行ってしまわないよう一定間隔で最新位置に移動する。
   */
  progressTaskLogInterval: number;
  /**
   * 仮想ディレクトリ表示に含めないエントリの正規表現パターン。
   * Mac のリソースフォークや AppleDouble 形式のメタデータなど、
   * ノイズになるエントリを除外するために使用する。
   */
  virtualDirExcludePattern: string;
};

/**
 * ショートカット押下時の、有効条件や実行コマンドの設定。
 */
export type ShortcutCommand = {
  /**
   * ショートカット引数。
   * CommandAction の args 引数として渡される。
   */
  args?: Record<string, unknown>;
  /**
   * コマンド名。
   * CommandsConfig の name プロパティに対応する。
   */
  cmd: string;
  /**
   * このショートカットが有効になるモード。
   * 通常文字列の場合は、そのモードの時に有効になる。
   * 先頭に `!` が付いている場合はそのモードではない時に有効になる。
   * 配列内のどれかひとつにでも該当すれば有効になる (or)。
   * tags が指定されている場合、同時にそちらも満たす必要がある (and)。
   */
  modes?: (Mode | `!${Mode}`)[];
  /**
   * このショートカットが有効になるタグ。
   * 通常文字列の場合は、そのタグの時に有効になる。
   * 先頭に `!` が付いている場合はそのタグではない時に有効になる。
   * 配列内のどれかひとつにでも該当すれば有効になる (or)。
   * modes が指定されている場合、同時にそちらも満たす必要がある (and)。
   */
  tags?: (Tag | `!${Tag}`)[];
};

/**
 *ショートカットの設定。
 */
export type ShortcutsConfig = Partial<
  Record<Scope, Record<string, ShortcutCommand[]>>
>;

/**
 * MIME とパスに基に、そのエントリを開くアプリケーションを決める。
 *
 * @param mime - MIME
 *   取れない場合は null。
 * @param path - エントリのパス
 * @returns アプリ名または null
 *
 * @example
 * ```ts
 * (mime, path) => {
 *   if (mime === 'application/toml') {
 *     return 'Visual Studio Code';
 *   }
 *   return null;
 * }
 * ```
 */
type AssociationFn = (mime: null | string, path: string) => null | string;

/**
 * MIME またはエントリのパスにパターンマッチングを行い、
 * そのエントリを開くアプリケーションを決める。
 *
 * @example
 * ```ts
 * {
 *   kind: 'mime',
 *   pattern: /^text\//,
 *   app: 'Visual Studio Code',
 * }
 * ```
 *
 * @example
 * ```ts
 * {
 *   kind: 'path',
 *   pattern: /\.json$/,
 *   app: 'Visual Studio Code',
 * }
 * ```
 */
type AssociationPattern = {
  /**
   * アプリ名。
   */
  app: string;
  /**
   * MIME かエントリのパス、どちらに対してマッチングを行うか。
   */
  kind: 'mime' | 'path';
  /**
   * 正規表現パターン。
   */
  pattern: RegExp;
};

/**
 * エントリを開くアプリケーションの設定。
 */
export type AssociationsConfig = (AssociationFn | AssociationPattern)[];

/**
 * アプリケーション全体の設定。
 */
export type Config = {
  associations: AssociationsConfig;
  commands: CommandsConfig;
  messages: MessagesConfig;
  settings: SettingsConfig;
  shortcuts: ShortcutsConfig;
};
