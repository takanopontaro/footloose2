import { useAtomValue } from 'jotai';
import { useEffect, useRef } from 'react';
import { $activeFrame, $scope } from '@modules/App/state';

import type { RefObject } from 'react';
import type { Frame } from '@modules/App/types';

type ReturnValue = {
  frameRef: RefObject<HTMLDivElement | null>;
  isFrameFocused: boolean;
};

export const useFocusFrame = (
  frame: Frame,
  initialFocus: boolean,
): ReturnValue => {
  const activeFrame = useAtomValue($activeFrame);
  const scope = useAtomValue($scope);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialFocus) {
      frameRef.current?.focus();
    }
  }, [initialFocus]);

  useEffect(() => {
    if (activeFrame === frame && scope === 'DataFrame') {
      frameRef.current?.focus();
    }
  }, [activeFrame, frame, scope]);

  return { frameRef, isFrameFocused: activeFrame === frame };
};
