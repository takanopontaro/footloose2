import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import { $activeFrame, $scope } from '@modules/App/state';

import type { RefObject } from 'react';
import type { Frame } from '@modules/App/types';

/**
 * 条件により、フレームにフォーカスを当てる。
 *
 * @param frame - 対象フレーム
 * @param frameRef - 対象フレームの ref
 * @param initialFocus - 初回読込時にフォーカスを当てるか否か
 */
export const useFocusFrame = (
  frame: Frame,
  frameRef: RefObject<HTMLDivElement | null>,
  initialFocus: boolean,
): void => {
  const activeFrame = useAtomValue($activeFrame);
  const scope = useAtomValue($scope);

  useEffect(() => {
    if (initialFocus) {
      frameRef.current?.focus();
    }
  }, [frameRef, initialFocus]);

  useEffect(() => {
    if (activeFrame === frame && scope === 'DataFrame') {
      frameRef.current?.focus();
    }
  }, [activeFrame, frame, frameRef, scope]);
};
