import { useAtomValue } from 'jotai';
import mime from 'mime';
import { useMemo } from 'react';
import { $currentDir } from '@modules/DataFrame/state';

import type { ReactNode } from 'react';
import type { Frame } from '@modules/App/types';
import type { Entry } from '@modules/DataFrame/types';

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
    const src = `/preview${curDir}/${entry.name}`;
    const type = mime.getType(src);
    if (type !== null && type.startsWith('image/')) {
      return <img alt="" className={className} src={src} />;
    }
    return null;
  }, [className, curDir, entry]);

  return node;
};
