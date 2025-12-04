import { useAtomValue } from 'jotai';
import mime from 'mime';
import { useMemo } from 'react';
import { $currentDir } from '@modules/DataFrame/state';

import type { ReactNode } from 'react';
import type { Frame } from '@modules/App/types';
import type { Entry } from '@modules/DataFrame/types';

/**
 * エントリが画像の時、それを表示する img 要素を返す。
 *
 * @param entry - 対象エントリ
 * @param frame - 対象フレーム
 * @param className - img 要素に付与するクラス名
 * @returns img 要素または null
 */
export const useThumbnail = (
  entry: Entry,
  frame: Frame,
  className?: string,
): ReactNode => {
  const curDir = useAtomValue($currentDir(frame));

  const node = useMemo(() => {
    if (!entry.perm.startsWith('-')) {
      return null;
    }
    // /preview/* はサーバーが提供する特別なルーティングで、
    // ファイルシステム上のリソースをロードできる。
    // 例えば /preview/foo/bar/baz.jpg だと /foo/bar/baz.jpg をロードする。
    const src = `/preview${curDir}/${entry.name}`;
    const type = mime.getType(src);
    if (type !== null && type.startsWith('image/')) {
      return <img alt="" className={className} src={src} />;
    }
    return null;
  }, [className, curDir, entry]);

  return node;
};
