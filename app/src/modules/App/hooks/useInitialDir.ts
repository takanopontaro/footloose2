import { $prevSessionDir } from '@modules/App/state';
import { useAtomValue } from 'jotai';
import { useState } from 'react';

export const useInitialDir = (): [string, string] => {
  const dirPathA = useAtomValue($prevSessionDir('a'));
  const dirPathB = useAtomValue($prevSessionDir('b'));
  const [pathA] = useState(dirPathA);
  const [pathB] = useState(dirPathB);
  return [pathA, pathB];
};
