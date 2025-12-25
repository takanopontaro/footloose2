import type { ReactNode, RefObject } from 'react';
import type { EntryModel } from '@modules/DataFrame/models';

/**
 * 各フレームのカレントディレクトリを表すオブジェクト。
 */
export type CurrentDir = {
  /**
   * 自身が仮想ディレクトリか否か。
   */
  is_virtual: boolean;
  /**
   * 自身のパス。
   */
  path: string;
};

/**
 * エントリ。
 */
export type Entry = {
  /**
   * 仮想ディレクトリ内のエントリか否か。
   */
  is_virtual: boolean;
  /**
   * シンボリックリンクの実体パス。
   * 種別を表す接頭辞とパスが結合された文字列。
   * 接頭辞は、SymlinkInfo 型の type プロパティに対応している。
   * 例： `d:/path/to/dir`, `f:/path/to/file`, `e:/path/to/broken-link`
   * リンクでない場合は空文字。
   */
  link: string;
  /**
   * 名前。
   */
  name: string;
  /**
   * パーミッションのシンボリック表記。
   * 例： `-rwxr-xr-x`
   */
  perm: string;
  /**
   * 容量。
   * 例： `8.0K`, `171.6M`
   */
  size: string;
  /**
   * 更新日時 (ctime)。
   */
  time: string;
};

/**
 * ディレクトリの詳細データ。
 */
export type DirData = {
  /**
   * エントリ一覧。
   */
  entries: Entry[];
  /**
   * ディレクトリのパス。
   */
  path: string;
};

/**
 * ブックマークデータ。
 */
export type Bookmark = {
  /**
   * 表示名。
   */
  name: string;
  /**
   * ディレクトリのパス。
   */
  path: string;
};

/**
 * ソート基準。
 */
export type SortCriterion = {
  /**
   * ディレクトリの表示位置。
   */
  dir: 'bottom' | 'none' | 'top';
  /**
   * 対象フィールド。
   */
  field: keyof Entry;
  /**
   * ソート順。
   */
  order: 'asc' | 'desc';
};

/**
 * カーソルの移動方向。
 */
export type CursorDirection = 'down' | 'left' | 'right' | 'up';

/**
 * 仮想ディレクトリの種類。
 */
export type VirtualDirKind = 'tar' | 'tgz' | 'zip';

/**
 * 仮想ディレクトリの詳細情報。
 */
export type VirtualDirInfo = {
  /**
   * アーカイブのパス。
   */
  archive: string;
  /**
   * 仮想ディレクトリの種類。
   */
  kind: VirtualDirKind;
};

/**
 * シンボリックリンクの詳細情報。
 */
export type SymlinkInfo = {
  /**
   * 実体のパス。
   */
  target: string;
  /**
   * 種別。
   * d:ディレクトリ | e:エラー | f:ファイル
   */
  type: 'd' | 'e' | 'f';
};

/**
 * ProgressTask の引数を表す構造体。
 */
export type ProgressTaskArgs = {
  /**
   * シェルコマンド。
   */
  cmd: string;
  /**
   * 出力先ディレクトリのパス。
   */
  dest?: string;
  /**
   * ログに表示するラベル。
   */
  label: string;
  /**
   * 対象エントリ名の一覧。
   */
  src: string[];
  /**
   * 処理対象エントリの総数を算出するシェルコマンド。
   */
  total: string;
} | null;

/**
 * ProgressTask に渡す引数を生成する関数。
 */
export type ProgressTaskArgsGenerator = (
  /**
   * 対象エントリの一覧。
   * 選択行があればそれらを、なければカレントエントリが使われる。
   */
  targets: EntryModel[],
  /**
   * ソースディレクトリ。
   */
  srcDir: CurrentDir,
  /**
   * 出力先ディレクトリ。
   */
  destDir: CurrentDir,
) => ProgressTaskArgs | Promise<ProgressTaskArgs>;

/**
 * ShTask の引数を表す構造体。
 */
export type ShTaskArgs = {
  /**
   * シェルコマンド。
   */
  cmd: string;
  /**
   * 出力先ディレクトリのパス。
   */
  dest?: string;
  /**
   * ログに表示するラベル。
   */
  log: string;
  /**
   * 対象エントリ名の一覧。
   */
  src?: string[];
} | null;

/**
 * ShTask に渡す引数を生成する関数。
 */
export type ShTaskArgsGenerator = (
  /**
   * 対象エントリの一覧。
   * 選択行があればそれらを、なければカレントエントリが使われる。
   */
  targets: EntryModel[],
  /**
   * ソースディレクトリ。
   */
  srcDir: CurrentDir,
  /**
   * 出力先ディレクトリ。
   */
  destDir: CurrentDir,
) => Promise<ShTaskArgs> | ShTaskArgs;

/**
 * プレビュー情報。
 * プレビューエリアのレンダリングに必要なデータ。
 */
export type PreviewInfo = {
  /**
   * プレビュー要素 (iframe, video など)。
   * プレビューがない場合は null。
   */
  node: ReactNode;
  /**
   * プレビュー要素の ref。
   */
  ref:
    | RefObject<HTMLIFrameElement | null>
    | RefObject<HTMLVideoElement | null>
    | null;
};

/**
 * changeDir 関数のオプション。
 */
export type ChangeDirOptions = {
  /**
   * エラーハンドラ。
   * WebSocket サーバーからエラーレスポンスが返ってきた場合に呼ばれる。
   *
   * @param msg - エラーメッセージ
   */
  errorHandler?: (msg: string) => void;
  /**
   * history モードを有効にするか否か。
   */
  historyMode?: boolean;
};
