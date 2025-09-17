import { useAtom, useAtomValue } from 'jotai';
import { useEffect } from 'react';
import { $api } from '@modules/App/state';
import { $currentDir } from '@modules/DataFrame/state';

import type { Frame } from '@modules/App/types';

export const useCurrentDir = (frame: Frame, initialDir: string): string => {
  const [currentDir, setCurrentDir] = useAtom($currentDir(frame));
  const api = useAtomValue($api);

  useEffect(() => {
    setCurrentDir(initialDir);
    api.changeDir(initialDir, frame);
  }, [api, frame, initialDir, setCurrentDir]);

  return currentDir;
};
