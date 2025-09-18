import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import { $activeFrame, $scope } from '@modules/App/state';

import type { RefObject } from 'react';
import type { Frame } from '@modules/App/types';

type ReturnValue = {
  isFrameFocused: boolean;
};

export const useFocusFrame = (
  frame: Frame,
  frameRef: RefObject<HTMLDivElement | null>,
  initialFocus: boolean,
): ReturnValue => {
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

  return { isFrameFocused: activeFrame === frame };
};
