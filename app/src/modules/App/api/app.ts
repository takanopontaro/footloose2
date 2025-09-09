import { readState, writeState } from '@libs/utils';
import { $activeFrame, $inactiveFrame, $scope } from '@modules/App/state';
import { $activeEntryName, $filteredEntries } from '@modules/DataFrame/state';
import {
  $listModalActiveEntryName,
  $listModalDataset,
} from '@modules/Modal/state';

import type { Frame } from '@modules/App/types';

function setDataFrameInScope(frame: Frame): void {
  const entries = readState($filteredEntries(frame));
  const name = readState($activeEntryName(frame));
  const exists = entries.some((e) => e.name === name);
  // ActiveEntry が filter されている場合
  if (!exists) {
    writeState($activeEntryName(frame), entries[0].name);
  }
  writeState($scope, 'DataFrame');
}

function focusDataFrame(): void {
  const frame = readState($activeFrame);
  setDataFrameInScope(frame);
}

function focusOtherDataFrame(): void {
  const frame = readState($inactiveFrame);
  writeState($activeFrame, frame);
  setDataFrameInScope(frame);
}

function focusDataFrameA(): void {
  writeState($activeFrame, 'a');
  setDataFrameInScope('a');
}

function focusDataFrameB(): void {
  writeState($activeFrame, 'b');
  setDataFrameInScope('b');
}

function focusLogFrame(): void {
  writeState($scope, 'LogFrame');
}

function focusEntryFilter(): void {
  writeState($scope, 'EntryFilter');
}

function focusListModal(): void {
  const dataset = readState($listModalDataset);
  // 全 Entry が filter されている場合
  if (dataset.length === 0) {
    return;
  }
  const name = readState($listModalActiveEntryName);
  const exists = dataset.some((d) => d.label === name);
  // ActiveEntry が filter されている場合
  if (!exists) {
    writeState($listModalActiveEntryName, dataset[0].label);
  }
  writeState($scope, 'ListModal');
}

function focusListModalEntryFilter(): void {
  writeState($scope, 'ListModalEntryFilter');
}

function focusPromptModal(): void {
  writeState($scope, 'PromptModal');
}

function focusConfirmModal(): void {
  writeState($scope, 'ConfirmModal');
}

export {
  focusDataFrame,
  focusOtherDataFrame,
  focusDataFrameA,
  focusDataFrameB,
  focusLogFrame,
  focusEntryFilter,
  focusListModal,
  focusListModalEntryFilter,
  focusPromptModal,
  focusConfirmModal,
};
