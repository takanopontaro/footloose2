import { useAtomValue } from 'jotai';
import { useState } from 'react';
import { $prevSessionDir } from '@modules/App/state';

/**
 * 初回読込時用のカレントディレクトリを返す。
 * 前回の最終ディレクトリが localStorage に保存されているため、
 * それを取り出して返す。
 *
 * @returns ディレクトリパスの配列 [frameA, frameB]
 */
export const useInitialDir = (): [string, string] => {
  const dirPathA = useAtomValue($prevSessionDir('a'));
  const dirPathB = useAtomValue($prevSessionDir('b'));

  // $prevSessionDir はカレントディレクトリが変わるたびに更新されるため、
  // dirPathA/B (=initialDir) をそのまま返すと re-render のトリガーになってしまう。
  // useState の初期値は、一度セットすると他の値をセットしても更新されないため、
  // この仕組みを利用して re-render を防ぐ。
  const [pathA] = useState(dirPathA);
  const [pathB] = useState(dirPathB);

  return [pathA, pathB];
};
