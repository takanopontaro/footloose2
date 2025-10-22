import { readState, writeState } from '@libs/utils';
import { $activeFrame, $inactiveFrame, $scope } from '@modules/App/state';
import { $activeEntryName, $filteredEntries } from '@modules/DataFrame/state';
import {
  $listModalActiveEntryName,
  $listModalDataset,
} from '@modules/Modal/state';

import type { Frame } from '@modules/App/types';

/**
 * DataFrame をスコープにする。
 * 結果として、そのフレームにフォーカスが当たる。
 *
 * @param frame - 対象フレーム
 */
function setDataFrameInScope(frame: Frame): void {
  const entries = readState($filteredEntries(frame));
  const name = readState($activeEntryName(frame));
  const exists = entries.some((e) => e.name === name);
  // カレント行が filter-out されている場合は `..` をカレントにする。
  // (カレント行が無い状態でフレームをアクティブにしないため)
  if (!exists) {
    writeState($activeEntryName(frame), entries[0].name);
  }
  writeState($scope, 'DataFrame');
}

/**
 * アクティブなフレームにフォーカスを当てる。
 */
function focusDataFrame(): void {
  const frame = readState($activeFrame);
  setDataFrameInScope(frame);
}

/**
 * 非アクティブなフレームにフォーカスを当てる。
 */
function focusOtherDataFrame(): void {
  const frame = readState($inactiveFrame);
  writeState($activeFrame, frame);
  setDataFrameInScope(frame);
}

/**
 * A フレーム (左) にフォーカスを当てる。
 */
function focusDataFrameA(): void {
  writeState($activeFrame, 'a');
  setDataFrameInScope('a');
}

/**
 * B フレーム (右) にフォーカスを当てる。
 */
function focusDataFrameB(): void {
  writeState($activeFrame, 'b');
  setDataFrameInScope('b');
}

/**
 * LogFrame にフォーカスを当てる。
 */
function focusLogFrame(): void {
  writeState($scope, 'LogFrame');
}

/**
 * EntryFilter にフォーカスを当てる。
 */
function focusEntryFilter(): void {
  writeState($scope, 'EntryFilter');
}

/**
 * ListModal のリスト部にフォーカスを当てる。
 */
function focusListModal(): void {
  const dataset = readState($listModalDataset);
  // 全リストデータが filter-out されている場合。
  if (dataset.length === 0) {
    return;
  }
  const name = readState($listModalActiveEntryName);
  const exists = dataset.some((d) => d.label === name);
  // カレント行が filter-out されている場合は最初のデータをカレントにする。
  // (カレント行が無い状態でリストをアクティブにしないため)
  if (!exists) {
    writeState($listModalActiveEntryName, dataset[0].label);
  }
  writeState($scope, 'ListModal');
}

/**
 * ListModal の EntryFilter 部にフォーカスを当てる。
 */
function focusListModalEntryFilter(): void {
  writeState($scope, 'ListModalEntryFilter');
}

/**
 * PromptModal にフォーカスを当てる。
 */
function focusPromptModal(): void {
  writeState($scope, 'PromptModal');
}

/**
 * ConfirmModal にフォーカスを当てる。
 */
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
