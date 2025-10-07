import type { ReactNode, RefObject } from 'react';

export type Entry = {
  link: string;
  name: string;
  perm: string;
  size: string;
  time: string;
};

export type DirData = {
  entries: Entry[];
  path: string;
};

export type Bookmark = {
  name: string;
  path: string;
};

export type SortCriterion = {
  dir: 'bottom' | 'none' | 'top';
  field: keyof Entry;
  order: 'asc' | 'desc';
};

export type CursorDirection = 'down' | 'left' | 'right' | 'up';

export type VirtualDirKind = 'tar' | 'tgz' | 'zip';

export type SymlinkInfo = {
  target: string;
  /** d:ディレクトリ | e:エラー | f:ファイル */
  type: 'd' | 'e' | 'f';
};

export type ProgressTaskCallbackResult = {
  cmd: string;
  dest?: string;
  label: string;
  src: string[];
  total: string;
} | null;

export type ProgressTaskCallback = (
  targetNames: string[],
  srcDir: string,
  destDir: string,
) => ProgressTaskCallbackResult | Promise<ProgressTaskCallbackResult>;

export type ShTaskCallbackResult = {
  cmd: string;
  dest?: string;
  log: string;
  src?: string[];
} | null;

export type ShTaskCallback = (
  targetNames: string[],
  srcDir: string,
  destDir: string,
) => Promise<ShTaskCallbackResult> | ShTaskCallbackResult;

export type PreviewInfo = {
  node: ReactNode;
  ref:
    | RefObject<HTMLIFrameElement | null>
    | RefObject<HTMLVideoElement | null>
    | null;
};
