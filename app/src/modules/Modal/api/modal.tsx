import { RESET } from 'jotai/utils';
import { cycleIndex, readState, getFocusableEl, writeState } from '@libs/utils';
import { focusDataFrame } from '@modules/App/api';
import { $modal } from '@modules/App/state';
import { ConfirmModal, PromptModal } from '@modules/Modal/components';
import {
  $confirmModalAction,
  $listModalAction,
  $listModalActiveEntryName,
  $listModalDataset,
  $listModalFilterQuery,
  $modalRef,
  $promptModalAction,
  $promptModalData,
} from '@modules/Modal/state';

import type { Direction } from '@modules/App/types';

// ListModal のカーソルを移動する。カーソルはループする。
// filter-out 等でカレント行が無い場合は、最初の項目をカレントにする。
function moveCursorListModal(step: number): void {
  const data = readState($listModalDataset);
  const name = readState($listModalActiveEntryName);
  const index = data.findIndex((d) => d.value === name);
  const newIndex = index !== -1 ? cycleIndex(index, step, data.length) : 0;
  writeState($listModalActiveEntryName, data[newIndex].value);
}

// ListModal のプライマリ処理を実行する。
// 引数として ListModalData か undefined を渡す。
// モーダルを閉じ、DataFrame にフォーカスを戻す。
function executePrimaryActionListModal(): void {
  const data = readState($listModalDataset);
  const name = readState($listModalActiveEntryName);
  const item = data.find((d) => d.value === name);
  const { primary } = readState($listModalAction);
  primary(item);
  writeState($modal, RESET);
  focusDataFrame();
}

// ListModal のセカンダリ処理を実行する。
// 引数として ListModalData か undefined を渡す。
// モーダルを閉じ、DataFrame にフォーカスを戻す。
function executeSecondaryActionListModal(): void {
  const data = readState($listModalDataset);
  const name = readState($listModalActiveEntryName);
  const item = data.find((d) => d.value === name);
  const { secondary } = readState($listModalAction);
  secondary?.(item);
  writeState($modal, RESET);
  focusDataFrame();
}

// ListModal のキャンセル処理を実行する。
// 引数は無し。
// モーダルを閉じ、DataFrame にフォーカスを戻す。
function executeCancelActionListModal(): void {
  const { cancel } = readState($listModalAction);
  cancel?.();
  writeState($modal, RESET);
  focusDataFrame();
}

// ListModal の FilterQuery をクリアする。
function clearListModalFilterQuery(): void {
  writeState($listModalFilterQuery, RESET);
}

// PromptModal を表示する。
function showPromptModal(defaultValue: string): Promise<string> {
  return new Promise((resolve) => {
    writeState($promptModalData, defaultValue);
    writeState($promptModalAction, {
      primary: (data) => resolve(data.trim()),
      cancel: () => resolve(''),
    });
    writeState($modal, <PromptModal />);
  });
}

// PromptModal のプライマリ処理を実行する。(セカンダリ処理は無し)
// 引数としてユーザー入力値を渡す。
// モーダルを閉じ、DataFrame にフォーカスを戻す。
function executeActionPromptModal(): void {
  const data = readState($promptModalData);
  const { primary } = readState($promptModalAction);
  primary(data);
  writeState($modal, RESET);
  focusDataFrame();
}

// PromptModal のキャンセル処理を実行する。
// 引数は無し。
// モーダルを閉じ、DataFrame にフォーカスを戻す。
function executeCancelActionPromptModal(): void {
  const { cancel } = readState($promptModalAction);
  cancel?.();
  writeState($modal, RESET);
  focusDataFrame();
}

// PromptModal 内のフォーカス可能要素にフォーカスを当てる。
function focusElementPromptModal(direction: Direction): void {
  const ref = readState($modalRef);
  if (ref !== null) {
    getFocusableEl(ref, direction)?.focus();
  }
}

// ConfirmModal を表示する。
function showConfirmModal(message: string): Promise<string> {
  return new Promise((resolve) => {
    writeState($confirmModalAction, {
      primary: () => resolve('ok'),
      cancel: () => resolve(''),
    });
    writeState($modal, <ConfirmModal message={message} />);
  });
}

// ConfirmModal のプライマリ処理を実行する。(セカンダリ処理は無し)
// 引数は無し。
// モーダルを閉じ、DataFrame にフォーカスを戻す。
function executeActionConfirmModal(): void {
  const { primary } = readState($confirmModalAction);
  primary();
  writeState($modal, RESET);
  focusDataFrame();
}

// ConfirmModal のキャンセル処理を実行する。
// 引数は無し。
// モーダルを閉じ、DataFrame にフォーカスを戻す。
function executeCancelActionConfirmModal(): void {
  const { cancel } = readState($confirmModalAction);
  cancel?.();
  writeState($modal, RESET);
  focusDataFrame();
}

// ConfirmModal 内のフォーカス可能要素にフォーカスを当てる。
function focusElementConfirmModal(direction: Direction): void {
  const ref = readState($modalRef);
  if (ref !== null) {
    getFocusableEl(ref, direction)?.focus();
  }
}

export {
  moveCursorListModal,
  executePrimaryActionListModal,
  executeSecondaryActionListModal,
  executeCancelActionListModal,
  clearListModalFilterQuery,
  showPromptModal,
  executeActionPromptModal,
  executeCancelActionPromptModal,
  focusElementPromptModal,
  showConfirmModal,
  executeActionConfirmModal,
  executeCancelActionConfirmModal,
  focusElementConfirmModal,
};
