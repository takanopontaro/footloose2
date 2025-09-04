import { RESET } from 'jotai/utils';
import { get, set } from '@libs/utils';
import { $activeFrame } from '@modules/App/state';
import { getTargetName } from '@modules/DataFrame/api';
import {
  calcGridIndex,
  calcTotalCells,
  cycleGridIndex,
} from '@modules/DataFrame/libs';
import {
  $activeEntryIndex,
  $activeEntryName,
  $filteredEntries,
  $gridColumnCount,
  $maxRenderedRowCount,
  $selectedEntryIndices,
  $selectedEntryNames,
} from '@modules/DataFrame/state';

import type { Direction } from '@modules/App/types';
import type { CursorDirection } from '@modules/DataFrame/types';

function calcDelta(
  step: number,
  colCount: number,
  direction: CursorDirection,
): number {
  switch (direction) {
    case 'up':
      return colCount * -step;
    case 'right':
      return step;
    case 'down':
      return colCount * step;
    case 'left':
      return -step;
  }
}

function moveCursor(
  step: number,
  direction: CursorDirection,
  loop = true,
  frame = get($activeFrame),
): void {
  const curIndex = get($activeEntryIndex(frame));
  if (curIndex === -1) {
    set($activeEntryIndex(frame), 0);
    return;
  }
  const entries = get($filteredEntries(frame));
  const gridColumnCount = get($gridColumnCount(frame));
  const delta = calcDelta(step, gridColumnCount, direction);
  const totalCells = calcTotalCells(entries.length, gridColumnCount);
  if (!loop) {
    const newIndex = calcGridIndex(
      curIndex,
      delta,
      direction,
      entries.length,
      gridColumnCount,
    );
    set($activeEntryIndex(frame), newIndex);
    return;
  }
  const newIndex = cycleGridIndex(
    curIndex,
    delta,
    direction,
    entries.length,
    totalCells,
  );
  set($activeEntryIndex(frame), newIndex);
}

function moveCursorByPage(
  direction: Direction,
  frame = get($activeFrame),
): void {
  const curIndex = get($activeEntryIndex(frame));
  if (curIndex === -1) {
    set($activeEntryIndex(frame), 0);
    return;
  }
  const gridColumnCount = get($gridColumnCount(frame));
  const maxRowCount = get($maxRenderedRowCount(frame));
  const itemsPerPage = maxRowCount * gridColumnCount;
  const entries = get($filteredEntries(frame));
  const delta = (itemsPerPage - gridColumnCount) * direction;
  const newIndex = calcGridIndex(
    curIndex,
    delta,
    direction === 1 ? 'down' : 'up',
    entries.length,
    gridColumnCount,
  );
  set($activeEntryIndex(frame), newIndex);
}

function moveCursorToEdge(
  direction: Direction,
  frame = get($activeFrame),
): void {
  const entries = get($filteredEntries(frame));
  const next = direction === 1 ? entries.length - 1 : 0;
  set($activeEntryIndex(frame), next);
}

function moveCursorByStartingLetter(
  key: string,
  frame = get($activeFrame),
): void {
  const entries = get($filteredEntries(frame));
  const curIndex = get($activeEntryIndex(frame));
  const firstPart = entries.slice(0, curIndex + 1);
  const secondPart = entries.slice(curIndex + 1);
  const newEntries = secondPart.concat(firstPart);
  const next = newEntries.find((e) => {
    key = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${key}`, 'i').test(e.name);
  });
  if (next) {
    set($activeEntryName(frame), next.name);
  }
}

function toggleRowSelectionByName(
  name: string,
  select?: boolean,
  frame = get($activeFrame),
): void {
  const selectedNames = get($selectedEntryNames(frame));
  if (select === undefined) {
    select = !selectedNames.includes(name);
  }
  set(
    $selectedEntryNames(frame),
    select
      ? (prev) => [...prev, name]
      : (prev) => prev.filter((n) => n !== name),
  );
}

function toggleRowSelectionByIndex(
  index: number,
  select?: boolean,
  frame = get($activeFrame),
): void {
  const entries = get($filteredEntries(frame));
  toggleRowSelectionByName(entries[index].name, select, frame);
}

function toggleRowSelection(select?: boolean, frame = get($activeFrame)): void {
  const name = getTargetName(frame);
  toggleRowSelectionByName(name, select, frame);
}

function selectAllRows(frame = get($activeFrame)): void {
  const entries = get($filteredEntries(frame));
  const allIndices = Array.from({ length: entries.length }, (_, i) => i);
  set($selectedEntryIndices(frame), allIndices);
}

function deselectAllRows(frame = get($activeFrame)): void {
  set($selectedEntryNames(frame), RESET);
}

function invertAllRowSelections(frame = get($activeFrame)): void {
  const entries = get($filteredEntries(frame));
  const allIndices = Array.from({ length: entries.length }, (_v, i) => i);
  const selectedIndices = get($selectedEntryIndices(frame));
  const res = allIndices.filter((i) => !selectedIndices.includes(i));
  set($selectedEntryIndices(frame), res);
}

export {
  moveCursor,
  moveCursorByPage,
  moveCursorToEdge,
  moveCursorByStartingLetter,
  toggleRowSelectionByName,
  toggleRowSelectionByIndex,
  toggleRowSelection,
  selectAllRows,
  deselectAllRows,
  invertAllRowSelections,
};
