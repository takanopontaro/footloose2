import { atom } from 'jotai';
import { RESET, atomFamily, atomWithReset } from 'jotai/utils';
import { readState, writeState } from '@libs/utils';
import {
  $activeEntryIndex,
  $gridColumnCount,
  $isGalleryMode,
  $lastVisibleEntryIndex,
  $firstVisibleEntryIndex,
} from '@modules/DataFrame/state';

import type { SetStateAction } from 'jotai';
import type { Frame } from '@modules/App/types';

/**
 * カレントエントリの変更に応じて、表示領域内の先頭エントリを更新する。
 *
 * @param frame - 対象フレーム
 */
function updateFirstVisibleEntryIndexInGalleryMode(frame: Frame): void {
  const activeEntryIndex = readState($activeEntryIndex(frame));
  const firstEntryIndex = readState($firstVisibleEntryIndex(frame));
  const lastEntryIndex = readState($lastVisibleEntryIndex(frame));
  const gridColumnCount = readState($gridColumnCount(frame));

  // カレントエントリが先頭エントリよりも前 (表示領域外) にある場合、
  // カレント行の先頭エントリを $firstVisibleEntryIndex に設定する。
  if (activeEntryIndex < firstEntryIndex) {
    const newIndex =
      Math.floor(activeEntryIndex / gridColumnCount) * gridColumnCount;
    writeState($firstVisibleEntryIndex(frame), newIndex);
    return;
  }

  // カレントエントリが末尾エントリよりも後 (表示領域外) にある場合、
  // それが表示領域内に来るように $firstVisibleEntryIndex を設定する。
  if (activeEntryIndex > lastEntryIndex) {
    // カレントエントリを表示領域内に収めるために必要な行数。
    const rowDelta = Math.ceil(
      (activeEntryIndex - lastEntryIndex) / gridColumnCount,
    );
    writeState(
      $firstVisibleEntryIndex(frame),
      firstEntryIndex + rowDelta * gridColumnCount,
    );
  }
}

const activeEntryNameAtom = atomFamily((_frame: Frame) => atomWithReset('..'));

/**
 * カレントエントリの name。
 */
export const $activeEntryName = atomFamily((frame: Frame) =>
  atom(
    (get) => get(activeEntryNameAtom(frame)),
    (get, set, newVal: SetStateAction<string> | typeof RESET) => {
      const curVal = get(activeEntryNameAtom(frame));
      if (typeof newVal === 'function') {
        newVal = newVal(curVal);
      }
      if (newVal === curVal) {
        return;
      }
      set(activeEntryNameAtom(frame), newVal);

      // ここで得られるインデックスは newVal に基づいた最新のもの。
      // atom の setter に渡される get はトランザクションの最新状態を見るため。
      // これが hooks の場合は、レンダリングサイクルがあるため、
      // set の後に get しても、同一トランザクションなら古い値が返ってくる。
      const activeEntryIndex = get($activeEntryIndex(frame));

      // -1 ということは、newVal のエントリが filter-out されているということ。
      // 矛盾が生じるため、リセットする。
      if (activeEntryIndex === -1) {
        set(activeEntryNameAtom(frame), RESET);
      }

      const isGalleryMode = get($isGalleryMode(frame));
      if (isGalleryMode) {
        // カレントエントリが表示領域外になった時の $firstVisibleEntryIndex の調整。
        // gallery モードの場合、複雑な計算が必要になる。
        updateFirstVisibleEntryIndexInGalleryMode(frame);
        return;
      }

      // リスト表示の時の $firstVisibleEntryIndex の調整。
      // gallery モードと違って単純な計算で済む。
      const activeEntryIdx = get($activeEntryIndex(frame));
      const firstEntryIndex = get($firstVisibleEntryIndex(frame));
      const lastEntryIndex = get($lastVisibleEntryIndex(frame));
      if (activeEntryIdx < firstEntryIndex) {
        set($firstVisibleEntryIndex(frame), activeEntryIdx);
      } else if (activeEntryIdx > lastEntryIndex) {
        const newIndex = firstEntryIndex + (activeEntryIdx - lastEntryIndex);
        set($firstVisibleEntryIndex(frame), newIndex);
      }
    },
  ),
);
