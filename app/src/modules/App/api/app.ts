import { get, set } from '@libs/utils';
import { $activeFrame, $inactiveFrame, $scope } from '@modules/App/state';
import { $activeEntryName, $filteredEntries } from '@modules/DataFrame/state';
import {
  $listModalActiveEntryName,
  $listModalDataset,
} from '@modules/Modal/state';

import type { Frame } from '@modules/App/types';

function setDataFrameInScope(frame: Frame): void {
  const entries = get($filteredEntries(frame));
  const name = get($activeEntryName(frame));
  const exists = entries.some((e) => e.name === name);
  // ActiveEntry が filter されている場合
  if (!exists) {
    set($activeEntryName(frame), entries[0].name);
  }
  set($scope, 'DataFrame');
}

function focusDataFrame(): void {
  const frame = get($activeFrame);
  setDataFrameInScope(frame);
}

function focusOtherDataFrame(): void {
  const frame = get($inactiveFrame);
  set($activeFrame, frame);
  setDataFrameInScope(frame);
}

function focusDataFrameA(): void {
  set($activeFrame, 'a');
  setDataFrameInScope('a');
}

function focusDataFrameB(): void {
  set($activeFrame, 'b');
  setDataFrameInScope('b');
}

function focusLogFrame(): void {
  set($scope, 'LogFrame');
}

function focusEntryFilter(): void {
  set($scope, 'EntryFilter');
}

function focusListModal(): void {
  const dataset = get($listModalDataset);
  // 全 Entry が filter されている場合
  if (dataset.length === 0) {
    return;
  }
  const name = get($listModalActiveEntryName);
  const exists = dataset.some((d) => d.label === name);
  // ActiveEntry が filter されている場合
  if (!exists) {
    set($listModalActiveEntryName, dataset[0].label);
  }
  set($scope, 'ListModal');
}

function focusListModalEntryFilter(): void {
  set($scope, 'ListModalEntryFilter');
}

function focusPromptModal(): void {
  set($scope, 'PromptModal');
}

function focusConfirmModal(): void {
  set($scope, 'ConfirmModal');
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
