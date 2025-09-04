import { useAtomValue } from 'jotai';
import mime from 'mime';
import { useMemo, useRef } from 'react';
import { $currentDir } from '@modules/DataFrame/state';

import type { Frame } from '@modules/App/types';
import type { Entry, PreviewInfo } from '@modules/DataFrame/types';

export const usePreview = (
  entry: Entry | null,
  frame: Frame,
  className?: string,
): PreviewInfo => {
  const dirName = useAtomValue($currentDir(frame));
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  return useMemo(() => {
    if (entry === null || !entry.perm.startsWith('-')) {
      return { node: null, ref: null };
    }
    const src = `/preview${dirName}/${entry.name}`;
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
        // key を付けないと更新されない
        <video key={src} ref={videoRef} className={className} controls>
          <source src={src} type={type} />
        </video>
      );
      return { node, ref: videoRef };
    }
    const node = (
      // key を付けないと更新されない
      <iframe
        key={src}
        ref={iframeRef}
        className={className}
        src={src}
        title="preview"
      />
    );
    return { node, ref: iframeRef };
  }, [className, dirName, entry]);
};
