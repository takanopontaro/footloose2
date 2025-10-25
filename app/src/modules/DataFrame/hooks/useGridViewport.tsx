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

/**
 * グリッドの表示領域に関する情報の更新を行う。
 * 表示可能行数、先頭エントリのインデックス、等。
 *
 * @param frame - 対象フレーム
 * @param gridRef - グリッドの ref
 */
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

  // useLayoutEffect 内で使用する。
  // activeEntryIndex を使うと deps に入るため、カーソル移動の度に再実行されてしまう。
  // それを防ぐため ref を使う。
  const activeEntryIndexRef = useRef(activeEntryIndex);
  activeEntryIndexRef.current = activeEntryIndex;

  // $maxVisibleRowCount の更新を行う。
  useLayoutEffect(() => {
    if (!gridRef.current) {
      return;
    }
    const { offsetHeight, offsetWidth } = gridRef.current;
    // 行の高さ。gallery モード時は幅と列数を元に算出できる (セルは正方形なため)。
    const rowH = isGalleryMode ? offsetWidth / gridColumnCount : rowHeight;
    // 見切れている行もカウントするので Math.ceil を使う。
    const maxRowCount = Math.ceil(offsetHeight / rowH);
    setMaxRowCount(maxRowCount);
  }, [gridColumnCount, gridRef, isGalleryMode, rowHeight, setMaxRowCount]);

  // $firstVisibleEntryIndex の更新を行う。
  // 列数が変わった時 (gallery モード切替時) や
  // 最大表示行数が更新された時に再計算する。
  useLayoutEffect(() => {
    const index = activeEntryIndexRef.current;
    if (index === -1) {
      setFirstEntryIndex(0);
      return;
    }
    // スクロール無しで全エントリを表示できる場合。
    if (index < maxRowCount * gridColumnCount) {
      setFirstEntryIndex(0);
      return;
    }
    // カレント行の、先頭エントリのインデックス。
    // リスト表示 (一列グリッド) 時はカレントエントリ自身。
    const newIndex = index - (index % gridColumnCount);
    // カレント行が、表示領域の先頭行になるようにする。
    // リスト表示とグリッド表示を切り替えると表示領域内のエントリ数が変わる。
    // そうなると、カーソル (カレントエントリ) が表示領域外に出てしまうことが
    // あり得るため、これを防ぐ。
    setFirstEntryIndex(newIndex);
  }, [gridColumnCount, maxRowCount, setFirstEntryIndex]);
};
