import { useAtom, useAtomValue } from 'jotai';
import { useEffect } from 'react';
import { $api } from '@modules/App/state';
import { $currentDir } from '@modules/DataFrame/state';

import type { Frame } from '@modules/App/types';

/**
 * カレントディレクトリを返す。
 * 初回読込時のみ、initialDir で更新も行う。
 *
 * @param frame - 対象フレーム
 * @param initialDir - 初期ディレクトリ
 * @return カレントディレクトリ
 */
export const useCurrentDir = (frame: Frame, initialDir: string): string => {
  const [currentDir, setCurrentDir] = useAtom($currentDir(frame));
  const api = useAtomValue($api);

  // 初回読込時のみ実行される。
  useEffect(() => {
    setCurrentDir(initialDir);
    api.changeDir(initialDir, frame);
  }, [api, frame, initialDir, setCurrentDir]);

  return currentDir;
};
