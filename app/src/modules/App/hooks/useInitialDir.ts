import { useAtomValue } from 'jotai';
import { useState } from 'react';
import { $prevSessionDir } from '@modules/App/state';

// 初回読込時のカレントディレクトリをセットする。
// 前回の最終ディレクトリが localStorage に保存されているため、
// それを取り出してセットする。
export const useInitialDir = (): [string, string] => {
  const dirPathA = useAtomValue($prevSessionDir('a'));
  const dirPathB = useAtomValue($prevSessionDir('b'));
  const [pathA] = useState(dirPathA);
  const [pathB] = useState(dirPathB);
  return [pathA, pathB];
};
