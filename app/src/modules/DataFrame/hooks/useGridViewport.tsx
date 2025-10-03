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

// グリッドのビューポートに関する処理を行う。
// 表示可能行数や開始エントリーの更新など。
export const useGridViewport = (
  frame: Frame,
  gridRef: RefObject<HTMLDivElement | null>,
): void => {
  const [maxRowCount, setMaxRowCount] = useAtom($maxVisibleRowCount(frame));
  const setFirstEntryIndex = useSetAtom($firstVisibleEntryIndex(frame));
  const gridColumnCount = useAtomValue($gridColumnCount(frame));
  const rowHeight = useAtomValue($renderedRowHeight);
  const isGalleryMode = useAtomValue($isGalleryMode(frame));
  const activeEntryIndex = useAtomValue($activeEntryIndex(frame));
  const activeEntryIndexRef = useRef(activeEntryIndex);

  activeEntryIndexRef.current = activeEntryIndex;

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
    const index = activeEntryIndexRef.current;
    if (index === -1) {
      setFirstEntryIndex(0);
      return;
    }
    // スクロール無しで全エントリーを表示できる場合
    if (index < maxRowCount * gridColumnCount) {
      setFirstEntryIndex(0);
      return;
    }
    const newIndex = index - (index % gridColumnCount);
    setFirstEntryIndex(newIndex);
  }, [gridColumnCount, maxRowCount, setFirstEntryIndex]);
};
