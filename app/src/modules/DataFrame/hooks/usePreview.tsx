import { useAtomValue } from 'jotai';
import mime from 'mime';
import { useMemo, useRef } from 'react';
import { readState } from '@libs/utils';
import { $config } from '@modules/App/state';
import { $currentDir } from '@modules/DataFrame/state';

import type { Frame } from '@modules/App/types';
import type { Entry, PreviewInfo } from '@modules/DataFrame/types';

/**
 * ファイルパスに対応する MIME タイプを返す。
 * Config の `mimeTypes` に一致するパターンがあればそれを優先し、
 * なければ `mime` モジュールでの推定結果を返す。
 *
 * @param path - ファイルパス
 * @returns 対応する MIME タイプ文字列または null
 */
function getMimeType(path: string): null | string {
  const { mimeTypes } = readState($config);
  for (const { mime: type, pattern } of mimeTypes) {
    const re = new RegExp(pattern);
    if (re.test(path)) {
      return type;
    }
  }
  return mime.getType(path);
}

/**
 * エントリの種類に応じて、プレビュー用の情報を返す。
 * 画像 <img> | ビデオ・オーディオ <video> | その他 <iframe>
 *
 * @param entry - 対象エントリ
 * @param frame - 対象フレーム
 * @param className - プレビュー要素に付与するクラス名
 * @returns プレビュー情報
 */
export const usePreview = (
  entry: Entry | null,
  frame: Frame,
  className?: string,
): PreviewInfo => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const curDir = useAtomValue($currentDir(frame));

  const info = useMemo(() => {
    if (entry === null || !entry.perm.startsWith('-')) {
      return { node: null, ref: null };
    }

    // /preview/* はサーバーが提供する特別なルーティングで、
    // ファイルシステム上のリソースをロードできる。
    // 例えば /preview/foo/bar/baz.jpg だと /foo/bar/baz.jpg をロードする。
    const src = `/preview${curDir}/${entry.name}`;
    const type = getMimeType(src);

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
        style={{ visibility: 'hidden' }}
        title="preview"
        onLoad={(e) => {
          // state を使わず品がないが、実用性を優先した。
          e.currentTarget.style.visibility = 'visible';
        }}
      />
    );
    return { node, ref: iframeRef };
  }, [className, curDir, entry]);

  return info;
};
