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
  isCursorOnFirstVisibleRow: boolean;
  isCursorOnLastVisibleRow: boolean;
  isOverflowing: boolean;
};

/**
 * グリッドの表示領域の状態を返す。
 * 全エントリを表示しきれていない、カーソルが最終行にある、等。
 *
 * @param frame - 対象フレーム
 * @param gridRef - グリッドの ref
 * @returns グリッドの表示領域の状態
 */
export const useGridState = (
  frame: Frame,
  gridRef: RefObject<HTMLDivElement | null>,
): ReturnValue => {
  // 現在の表示領域に全エントリを表示しきれて「いない」か否か。
  // いない＝溢れている、場合に true になる。
  // 完全に表示できている場合のみ false。
  // 見えていても、見切れている場合は true。
  const [isOverflowing, setIsOverflowing] = useState(false);

  // カーソルが表示領域の最終行にあるか否か。
  // 以下のようにエントリ一覧の下部が見切れている時に、
  // 2 の位置にカーソルを移動した場合、全体的な表示を下寄せにしたい。
  // その手がかりとして使用する。
  // 実際に下寄せにするのはスタイルシートで行う。
  //
  //                                       +---------+---------+
  //                                       |         |         |
  // +--+---------+---------+--+        +-------------------------+
  // |  |         |         |  |        |  |    0    |    1    |  |
  // |  |    0    |    1    |  |   ->   |  |         |         |  |
  // |  |         |         |  |   ->   |  +---------+---------+  |
  // |  +---------+---------+  |   ->   |  |         |         |  |
  // |  |         |         |  |   ->   |  |    *    |    3    |  |
  // |  |    *    |    3    |  |        |  |         |         |  |
  // +-------------------------+        +--+---------+---------+--+
  //    |         |         |
  //    +---------+---------+
  //
  const [isCursorOnLastVisibleRow, setIsCursorOnLastVisibleRow] =
    useState(false);

  // カーソルが表示領域の開始行にあるか否か。
  // 以下のようにエントリ一覧の上部が見切れている時に、
  // 0 の位置にカーソルを移動した場合、全体的な表示を上寄せにしたい。
  // その手がかりとして使用する。
  // デフォルトは上寄せだが、一度 isCursorOnLastVisibleRow で下寄せ状態になった後、
  // 元の上寄せに戻すか否かの判定に使用する。
  // 実際に上寄せにするのはスタイルシートで行う。
  //
  //    +---------+---------+
  //    |         |         |
  // +-------------------------+        +--+---------+---------+--+
  // |  |    *    |    1    |  |        |  |         |         |  |
  // |  |         |         |  |   ->   |  |    *    |    1    |  |
  // |  +---------+---------+  |   ->   |  |         |         |  |
  // |  |         |         |  |   ->   |  +---------+---------+  |
  // |  |    2    |    3    |  |   ->   |  |         |         |  |
  // |  |         |         |  |        |  |    2    |    3    |  |
  // +--+---------+---------+--+        +-------------------------+
  //                                       |         |         |
  //                                       +---------+---------+
  //
  const [isCursorOnFirstVisibleRow, setIsCursorOnFirstVisibleRow] =
    useState(false);

  const entries = useAtomValue($filteredEntries(frame));
  const isGalleryMode = useAtomValue($isGalleryMode(frame));
  const maxRowCount = useAtomValue($maxVisibleRowCount(frame));
  const firstEntryIndex = useAtomValue($firstVisibleEntryIndex(frame));
  const activeEntryIndex = useAtomValue($activeEntryIndex(frame));
  const gridColumnCount = useAtomValue($gridColumnCount(frame));
  const rowHeight = useAtomValue($renderedRowHeight);

  // 全エントリを表示しきれていないかどうかの判定を行う。
  useLayoutEffect(() => {
    if (!gridRef.current) {
      return;
    }
    const { offsetHeight, offsetWidth } = gridRef.current;
    // 行の高さ。gallery モード時は幅と列数を元に算出できる (セルは正方形なため)。
    const rowH = isGalleryMode ? offsetWidth / gridColumnCount : rowHeight;
    // 行が見切れている場合は溢れていると見なすので Math.floor を使う。
    const rowCount = Math.floor(offsetHeight / rowH);
    const overflowing = entries.length > gridColumnCount * rowCount;
    setIsOverflowing(overflowing);
  }, [entries.length, gridColumnCount, gridRef, isGalleryMode, rowHeight]);

  useLayoutEffect(() => {
    // まず開始行のチェックを行う。

    // 開始行の次の行の、先頭エントリのインデックス。
    const secondRowStartIndex = firstEntryIndex + gridColumnCount;

    // カーソルが開始行にあるか否か。
    const isOnFirstRow = activeEntryIndex < secondRowStartIndex;
    if (isOnFirstRow) {
      setIsCursorOnFirstVisibleRow(true);
      setIsCursorOnLastVisibleRow(false);
    }

    // 次に最終行のチェックを行う。

    // 最終行の先頭エントリのインデックス。
    const lastRowStartIndex =
      firstEntryIndex + gridColumnCount * maxRowCount - gridColumnCount;

    // カーソルが最終行にあるか否か。
    const isOnLastRow = activeEntryIndex >= lastRowStartIndex;
    if (isOnLastRow) {
      setIsCursorOnFirstVisibleRow(false);
      setIsCursorOnLastVisibleRow(true);
    }
  }, [activeEntryIndex, firstEntryIndex, gridColumnCount, maxRowCount]);

  return {
    isCursorOnFirstVisibleRow,
    isCursorOnLastVisibleRow,
    isOverflowing,
  };
};
