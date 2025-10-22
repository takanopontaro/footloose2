import { useAtomValue } from 'jotai';
import { $prevSessionDir } from '@modules/App/state';

/**
 * 初回読込時用のカレントディレクトリを返す。
 * 前回の最終ディレクトリが localStorage に保存されているため、
 * それを取り出して返す。
 *
 * @return ディレクトリパスの配列 [frameA, frameB]
 */
export const useInitialDir = (): [string, string] => {
  const dirPathA = useAtomValue($prevSessionDir('a'));
  const dirPathB = useAtomValue($prevSessionDir('b'));
  return [dirPathA, dirPathB];
};
