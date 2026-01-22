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

/**
 * ListModal のカーソルを移動する。
 * カーソルはループする。
 * filter-out 等でカレントエントリが無い場合は、最初の項目をカレントにする。
 *
 * @param step - カーソルの移動量
 */
function moveCursorListModal(step: number): void {
  const data = readState($listModalDataset);
  const name = readState($listModalActiveEntryName);
  const index = data.findIndex((d) => d.value === name);
  const newIndex = index !== -1 ? cycleIndex(index, step, data.length) : 0;
  writeState($listModalActiveEntryName, data[newIndex].value);
}

/**
 * ListModal のプライマリ処理を実行する。
 * 引数として ListModalData か undefined が渡される。
 * モーダルを閉じ、DataFrame にフォーカスを戻す。
 */
function executePrimaryActionListModal(): void {
  const data = readState($listModalDataset);
  const name = readState($listModalActiveEntryName);
  const item = data.find((d) => d.value === name);
  const { primary } = readState($listModalAction);
  primary(item);
  writeState($modal, RESET);
  focusDataFrame();
}

/**
 * ListModal のセカンダリ処理を実行する。
 * 引数として ListModalData か undefined が渡される。
 * モーダルを閉じ、DataFrame にフォーカスを戻す。
 */
function executeSecondaryActionListModal(): void {
  const data = readState($listModalDataset);
  const name = readState($listModalActiveEntryName);
  const item = data.find((d) => d.value === name);
  const { secondary } = readState($listModalAction);
  secondary?.(item);
  writeState($modal, RESET);
  focusDataFrame();
}

/**
 * ListModal のキャンセル処理を実行する。
 * 引数は無し。
 * モーダルを閉じ、DataFrame にフォーカスを戻す。
 */
function executeCancelActionListModal(): void {
  const { cancel } = readState($listModalAction);
  cancel?.();
  writeState($modal, RESET);
  focusDataFrame();
}

/**
 * ListModal の FilterQuery をクリアする。
 */
function clearListModalFilterQuery(): void {
  writeState($listModalFilterQuery, RESET);
}

/**
 * PromptModal を表示する。
 *
 * @param message - モーダルに表示する文章
 * @param defaultValue - テキストフィールドの初期値
 * @returns ユーザー入力値 (キャンセル時は空文字) の Promise
 */
function showPromptModal(
  message: string,
  defaultValue: string,
): Promise<string> {
  return new Promise((resolve) => {
    writeState($promptModalData, defaultValue);
    writeState($promptModalAction, {
      primary: (data) => resolve(data),
      cancel: () => resolve(''),
    });
    writeState($modal, <PromptModal message={message} />);
  });
}

/**
 * PromptModal のプライマリ処理を実行する。
 * 引数としてユーザー入力値が渡される。
 * セカンダリ処理は無し。
 * モーダルを閉じ、DataFrame にフォーカスを戻す。
 */
function executeActionPromptModal(): void {
  const data = readState($promptModalData);
  const { primary } = readState($promptModalAction);
  primary(data);
  writeState($modal, RESET);
  focusDataFrame();
}

/**
 * PromptModal のキャンセル処理を実行する。
 * 引数は無し。
 * モーダルを閉じ、DataFrame にフォーカスを戻す。
 */
function executeCancelActionPromptModal(): void {
  const { cancel } = readState($promptModalAction);
  cancel?.();
  writeState($modal, RESET);
  focusDataFrame();
}

/**
 * 移動方向に基づいて、PromptModal 内のフォーカス可能要素にフォーカスを当てる。
 *
 * @param direction - フォーカスの移動方向
 */
function focusElementPromptModal(direction: Direction): void {
  const ref = readState($modalRef);
  if (ref) {
    getFocusableEl(ref, direction)?.focus();
  }
}

/**
 * ConfirmModal を表示する。
 *
 * @param message - モーダルに表示する文章
 * @returns ユーザー選択値 (OK:true / Cancel:false) の Promise
 */
function showConfirmModal(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    writeState($confirmModalAction, {
      primary: () => resolve(true),
      cancel: () => resolve(false),
    });
    writeState($modal, <ConfirmModal message={message} />);
  });
}

/**
 * ConfirmModal のプライマリ処理を実行する。
 * 引数は無し。
 * セカンダリ処理は無し。
 * モーダルを閉じ、DataFrame にフォーカスを戻す。
 */
function executeActionConfirmModal(): void {
  const { primary } = readState($confirmModalAction);
  primary();
  writeState($modal, RESET);
  focusDataFrame();
}

/**
 * ConfirmModal のキャンセル処理を実行する。
 * 引数は無し。
 * モーダルを閉じ、DataFrame にフォーカスを戻す。
 */
function executeCancelActionConfirmModal(): void {
  const { cancel } = readState($confirmModalAction);
  cancel?.();
  writeState($modal, RESET);
  focusDataFrame();
}

/**
 * 移動方向に基づいて、ConfirmModal 内のフォーカス可能要素にフォーカスを当てる。
 *
 * @param direction - フォーカスの移動方向
 */
function focusElementConfirmModal(direction: Direction): void {
  const ref = readState($modalRef);
  if (ref) {
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
