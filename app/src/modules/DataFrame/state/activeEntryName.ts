import { atom } from 'jotai';
import { RESET, atomFamily, atomWithReset } from 'jotai/utils';
import { readState, writeState } from '@libs/utils';
import {
  $activeEntryIndex,
  $gridColumnCount,
  $isGalleryMode,
  $renderedEntryEndIndex,
  $renderedEntryStartIndex,
} from '@modules/DataFrame/state';

import type { SetStateAction } from 'jotai';
import type { Frame } from '@modules/App/types';

const activeEntryNameAtom = atomFamily((_frame: Frame) => atomWithReset('..'));

function updateStartRowInGalleryMode(frame: Frame): void {
  const curIndex = readState($activeEntryIndex(frame));
  const startRow = readState($renderedEntryStartIndex(frame));
  const endRow = readState($renderedEntryEndIndex(frame));
  const colCount = readState($gridColumnCount(frame));
  if (curIndex < startRow) {
    const newRow = Math.floor(curIndex / colCount) * colCount;
    writeState($renderedEntryStartIndex(frame), newRow);
    return;
  }
  if (curIndex > endRow) {
    const rowDelta = Math.ceil((curIndex - endRow) / colCount);
    writeState($renderedEntryStartIndex(frame), startRow + rowDelta * colCount);
  }
}

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

      // ここで得られる index は newVal に基づいた最新のもの。
      // atom の setter に渡される get はトランザクションの最新状態を見るため。
      // これが hooks の場合は、レンダリングサイクルがあるため、
      // set の後に get しても、同一トランザクションなら古い値が返ってくる。
      const index = get($activeEntryIndex(frame));

      // -1 ということは filter out されているということ
      if (index === -1) {
        set(activeEntryNameAtom(frame), RESET);
      }

      const isGalleryMode = get($isGalleryMode(frame));
      if (isGalleryMode) {
        updateStartRowInGalleryMode(frame);
        return;
      }

      const curIndex = get($activeEntryIndex(frame));
      const startRow = get($renderedEntryStartIndex(frame));
      const endRow = get($renderedEntryEndIndex(frame));
      if (curIndex < startRow) {
        set($renderedEntryStartIndex(frame), curIndex);
      } else if (curIndex > endRow) {
        set($renderedEntryStartIndex(frame), startRow + (curIndex - endRow));
      }
    },
  ),
);
