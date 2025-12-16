import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { debounce } from '@libs/utils';
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

/**
 * グリッドの表示領域に関する情報の更新を行う。
 * 表示可能行数、開始エントリのインデックス、等。
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
  const entries = useAtomValue($filteredEntries(frame));
  const gridColumnCount = useAtomValue($gridColumnCount(frame));
  const rowHeight = useAtomValue($renderedRowHeight);
  const isGalleryMode = useAtomValue($isGalleryMode(frame));
  const activeEntryIndex = useAtomValue($activeEntryIndex(frame));

  // useLayoutEffect 内で使用する。
  // activeEntryIndex を使うと deps に入るため、カーソル移動の度に再実行されてしまう。
  // それを防ぐため ref を使う。
  const activeEntryIndexRef = useRef(activeEntryIndex);
  activeEntryIndexRef.current = activeEntryIndex;

  // グリッドを考慮して $maxVisibleRowCount を設定する。
  const updateMaxVisibleRowCount = useCallback(() => {
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

  // $maxVisibleRowCount の更新を行う。
  useLayoutEffect(() => {
    updateMaxVisibleRowCount();
  }, [updateMaxVisibleRowCount]);

  // ウィンドウのリサイズ時、$maxVisibleRowCount を更新する。
  useEffect(() => {
    const fn = debounce(updateMaxVisibleRowCount, 200);
    window.addEventListener('resize', fn);
    return () => {
      window.removeEventListener('resize', fn);
    };
  }, [updateMaxVisibleRowCount]);

  // $firstVisibleEntryIndex の更新を行う。
  // 列数が変わった時 (gallery モード切替時) や
  // 最大表示行数が更新された時に再計算する。
  useLayoutEffect(() => {
    const curIndex = activeEntryIndexRef.current;
    if (curIndex === -1) {
      setFirstEntryIndex(0);
      return;
    }

    // スクロール無しで全エントリを表示できる場合。
    if (curIndex < maxRowCount * gridColumnCount) {
      setFirstEntryIndex(0);
      return;
    }

    // カレント行の、先頭エントリのインデックス。
    // リスト表示 (一列グリッド) 時はカレントエントリ自身。
    const curRowStartIndex = curIndex - (curIndex % gridColumnCount);

    // 仮にカレント行を表示領域の開始行にした場合、
    // 表示領域に表示されるはずのエントリの行数。
    const visibleRowCount = Math.ceil(
      (entries.length - curRowStartIndex) / gridColumnCount,
    );

    // その場合の空行数。例えば 5 行表示可能なエリアに 3 行分のエントリしか
    // 表示されない場合、2 になる。
    const remainingRowCount = maxRowCount - visibleRowCount;

    // 空行がある＝下が空いているということ。
    // 見た目が悪いので、開始エントリを前にズラして空きを埋める。
    if (remainingRowCount > 0) {
      const newIndex = curRowStartIndex - remainingRowCount * gridColumnCount;
      setFirstEntryIndex(newIndex);
      return;
    }

    // 空行がない場合は、カレント行が表示領域の開始行になるようにする。
    // リスト表示とグリッド表示を切り替えると表示領域内のエントリ数が変わる。
    // そうなると、カーソル (カレントエントリ) が表示領域外に出てしまうことが
    // あり得るため、これを防ぐ。
    setFirstEntryIndex((prev) => {
      // 表示領域外直後のインデックス。表示領域が 0-9 の場合、10。
      const afterVisibleIndex = prev + maxRowCount * gridColumnCount;
      // カーソルが表示領域内にあるなら現在の値のままでよい。
      return prev <= curIndex && curIndex < afterVisibleIndex
        ? prev
        : curRowStartIndex;
    });
  }, [entries.length, gridColumnCount, maxRowCount, setFirstEntryIndex]);
};
