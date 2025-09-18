import { RESET } from 'jotai/utils';
import { readState, writeState } from '@libs/utils';
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
  $maxVisibleRowCount,
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
  frame = readState($activeFrame),
): void {
  const curIndex = readState($activeEntryIndex(frame));
  if (curIndex === -1) {
    writeState($activeEntryIndex(frame), 0);
    return;
  }
  const entries = readState($filteredEntries(frame));
  const gridColumnCount = readState($gridColumnCount(frame));
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
    writeState($activeEntryIndex(frame), newIndex);
    return;
  }
  const newIndex = cycleGridIndex(
    curIndex,
    delta,
    direction,
    entries.length,
    totalCells,
  );
  writeState($activeEntryIndex(frame), newIndex);
}

function moveCursorByPage(
  direction: Direction,
  frame = readState($activeFrame),
): void {
  const curIndex = readState($activeEntryIndex(frame));
  if (curIndex === -1) {
    writeState($activeEntryIndex(frame), 0);
    return;
  }
  const gridColumnCount = readState($gridColumnCount(frame));
  const maxRowCount = readState($maxVisibleRowCount(frame));
  const itemsPerPage = maxRowCount * gridColumnCount;
  const entries = readState($filteredEntries(frame));
  const delta = (itemsPerPage - gridColumnCount) * direction;
  const newIndex = calcGridIndex(
    curIndex,
    delta,
    direction === 1 ? 'down' : 'up',
    entries.length,
    gridColumnCount,
  );
  writeState($activeEntryIndex(frame), newIndex);
}

function moveCursorToEdge(
  direction: Direction,
  frame = readState($activeFrame),
): void {
  const entries = readState($filteredEntries(frame));
  const next = direction === 1 ? entries.length - 1 : 0;
  writeState($activeEntryIndex(frame), next);
}

function moveCursorByStartingLetter(
  key: string,
  frame = readState($activeFrame),
): void {
  const entries = readState($filteredEntries(frame));
  const curIndex = readState($activeEntryIndex(frame));
  const firstPart = entries.slice(0, curIndex + 1);
  const secondPart = entries.slice(curIndex + 1);
  const newEntries = secondPart.concat(firstPart);
  const next = newEntries.find((e) => {
    key = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${key}`, 'i').test(e.name);
  });
  if (next) {
    writeState($activeEntryName(frame), next.name);
  }
}

function toggleRowSelectionByName(
  name: string,
  select?: boolean,
  frame = readState($activeFrame),
): void {
  const selectedNames = readState($selectedEntryNames(frame));
  if (select === undefined) {
    select = !selectedNames.includes(name);
  }
  writeState(
    $selectedEntryNames(frame),
    select
      ? (prev) => [...prev, name]
      : (prev) => prev.filter((n) => n !== name),
  );
}

function toggleRowSelectionByIndex(
  index: number,
  select?: boolean,
  frame = readState($activeFrame),
): void {
  const entries = readState($filteredEntries(frame));
  toggleRowSelectionByName(entries[index].name, select, frame);
}

function toggleRowSelection(
  select?: boolean,
  frame = readState($activeFrame),
): void {
  const name = getTargetName(frame);
  toggleRowSelectionByName(name, select, frame);
}

function selectAllRows(frame = readState($activeFrame)): void {
  const entries = readState($filteredEntries(frame));
  const allIndices = Array.from({ length: entries.length }, (_, i) => i);
  writeState($selectedEntryIndices(frame), allIndices);
}

function deselectAllRows(frame = readState($activeFrame)): void {
  writeState($selectedEntryNames(frame), RESET);
}

function invertAllRowSelections(frame = readState($activeFrame)): void {
  const entries = readState($filteredEntries(frame));
  const allIndices = Array.from({ length: entries.length }, (_v, i) => i);
  const selectedIndices = readState($selectedEntryIndices(frame));
  const res = allIndices.filter((i) => !selectedIndices.includes(i));
  writeState($selectedEntryIndices(frame), res);
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
