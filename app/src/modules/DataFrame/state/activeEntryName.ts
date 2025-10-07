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

function updateFirstEntryIndexInGalleryMode(frame: Frame): void {
  const activeEntryIndex = readState($activeEntryIndex(frame));
  const firstEntryIndex = readState($firstVisibleEntryIndex(frame));
  const lastEntryIndex = readState($lastVisibleEntryIndex(frame));
  const gridColumnCount = readState($gridColumnCount(frame));

  if (activeEntryIndex < firstEntryIndex) {
    const newIndex =
      Math.floor(activeEntryIndex / gridColumnCount) * gridColumnCount;
    writeState($firstVisibleEntryIndex(frame), newIndex);
    return;
  }

  if (activeEntryIndex > lastEntryIndex) {
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
        updateFirstEntryIndexInGalleryMode(frame);
        return;
      }

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
