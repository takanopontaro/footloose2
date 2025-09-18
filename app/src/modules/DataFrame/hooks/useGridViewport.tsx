import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useLayoutEffect, useRef } from 'react';
import {
  $activeEntryIndex,
  $gridColumnCount,
  $maxVisibleRowCount,
  $firstVisibleEntryIndex,
  $renderedRowHeight,
  $isGalleryMode,
} from '@modules/DataFrame/state';

import type { RefObject } from 'react';
import type { Frame } from '@modules/App/types';

export const useGridViewport = (
  frame: Frame,
  gridRef: RefObject<HTMLDivElement | null>,
): void => {
  const [maxRowCount, setMaxRowCount] = useAtom($maxVisibleRowCount(frame));
  const setFirstEntryIndex = useSetAtom($firstVisibleEntryIndex(frame));
  const gridColumnCount = useAtomValue($gridColumnCount(frame));
  const rowHeight = useAtomValue($renderedRowHeight);
  const isGalleryMode = useAtomValue($isGalleryMode(frame));
  const curIndex = useAtomValue($activeEntryIndex(frame));
  const curIndexRef = useRef(curIndex);

  curIndexRef.current = curIndex;

  useLayoutEffect(() => {
    if (!gridRef.current) {
      return;
    }
    const { offsetHeight, offsetWidth } = gridRef.current;
    const rowH = isGalleryMode ? offsetWidth / gridColumnCount : rowHeight;
    const maxRowCount = Math.ceil(offsetHeight / rowH);
    setMaxRowCount(maxRowCount);
  }, [gridColumnCount, gridRef, isGalleryMode, rowHeight, setMaxRowCount]);

  useLayoutEffect(() => {
    const index = curIndexRef.current;
    if (index === -1) {
      setFirstEntryIndex(0);
      return;
    }
    // スクロール無しで全 entry を表示できる場合
    if (index < maxRowCount * gridColumnCount) {
      setFirstEntryIndex(0);
      return;
    }
    const newIndex = index - (index % gridColumnCount);
    setFirstEntryIndex(newIndex);
  }, [gridColumnCount, maxRowCount, setFirstEntryIndex]);
};
