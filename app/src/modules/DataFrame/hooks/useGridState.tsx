import { useAtomValue } from 'jotai';
import { useLayoutEffect, useState } from 'react';
import {
  $activeEntryIndex,
  $gridColumnCount,
  $maxVisibleRowCount,
  $firstVisibleEntryIndex,
  $renderedRowHeight,
  $isGalleryMode,
  $filteredEntries,
} from '@modules/DataFrame/state';

import type { RefObject } from 'react';
import type { Frame } from '@modules/App/types';

type ReturnValue = {
  isFirstRowVisible: boolean;
  isLastRowVisible: boolean;
  isOverflowing: boolean;
};

export const useGridState = (
  frame: Frame,
  gridRef: RefObject<HTMLDivElement | null>,
): ReturnValue => {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isFirstRowVisible, setIsFirstRowVisible] = useState(false);
  const [isLastRowVisible, setIsLastRowVisible] = useState(false);
  const entries = useAtomValue($filteredEntries(frame));
  const isGalleryMode = useAtomValue($isGalleryMode(frame));
  const maxRowCount = useAtomValue($maxVisibleRowCount(frame));
  const firstEntryIndex = useAtomValue($firstVisibleEntryIndex(frame));
  const curIndex = useAtomValue($activeEntryIndex(frame));
  const gridColumnCount = useAtomValue($gridColumnCount(frame));
  const rowHeight = useAtomValue($renderedRowHeight);

  useLayoutEffect(() => {
    if (!gridRef.current) {
      return;
    }
    const { offsetHeight, offsetWidth } = gridRef.current;
    const rowH = isGalleryMode ? offsetWidth / gridColumnCount : rowHeight;
    const rowCount = Math.floor(offsetHeight / rowH);
    const overflowing = entries.length > gridColumnCount * rowCount;
    setIsOverflowing(overflowing);
  }, [entries.length, gridColumnCount, gridRef, isGalleryMode, rowHeight]);

  useLayoutEffect(() => {
    const firstRowVisible = curIndex < firstEntryIndex + gridColumnCount;
    if (firstRowVisible) {
      setIsFirstRowVisible(true);
      setIsLastRowVisible(false);
    }
    const lastRowVisible =
      curIndex >=
      firstEntryIndex + gridColumnCount * maxRowCount - gridColumnCount;
    if (lastRowVisible) {
      setIsFirstRowVisible(false);
      setIsLastRowVisible(true);
    }
  }, [curIndex, firstEntryIndex, gridColumnCount, maxRowCount]);

  return { isFirstRowVisible, isLastRowVisible, isOverflowing };
};
