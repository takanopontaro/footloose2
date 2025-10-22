import { useAtomValue } from 'jotai';
import mime from 'mime';
import { useMemo, useRef } from 'react';
import { $currentDir } from '@modules/DataFrame/state';

import type { Frame } from '@modules/App/types';
import type { Entry, PreviewInfo } from '@modules/DataFrame/types';

/**
 * エントリの種類に応じて、プレビュー用の情報を返す。
 * 画像 <img> | ビデオ・オーディオ <video> | その他 <iframe>
 *
 * @param entry - 対象エントリ
 * @param frame - 対象フレーム
 * @param className - プレビュー要素に付与するクラス名
 * @return プレビュー情報
 */
export const usePreview = (
  entry: Entry | null,
  frame: Frame,
  className?: string,
): PreviewInfo => {
  const curDir = useAtomValue($currentDir(frame));
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const info = useMemo(() => {
    if (entry === null || !entry.perm.startsWith('-')) {
      return { node: null, ref: null };
    }

    // /preview/* はサーバーが提供する特別なルーティングで、
    // ファイルシステム上のリソースをロードできる。
    // 例えば /preview/foo/bar/baz.jpg だと /foo/bar/baz.jpg をロードする。
    const src = `/preview${curDir}/${entry.name}`;
    const type = mime.getType(src);

    if (type === null) {
      const node = <div className="preview_unavailable" />;
      return { node, ref: null };
    }

    if (type.startsWith('image/')) {
      const node = <img alt="" className={className} src={src} />;
      return { node, ref: null };
    }

    if (type.startsWith('video/') || type.startsWith('audio/')) {
      const node = (
        // key を付けないと描画が更新されない。
        <video key={src} ref={videoRef} className={className} controls>
          <source src={src} type={type} />
        </video>
      );
      return { node, ref: videoRef };
    }

    const node = (
      // key を付けないと描画が更新されない。
      <iframe
        key={src}
        ref={iframeRef}
        className={className}
        src={src}
        title="preview"
      />
    );
    return { node, ref: iframeRef };
  }, [className, curDir, entry]);

  return info;
};
