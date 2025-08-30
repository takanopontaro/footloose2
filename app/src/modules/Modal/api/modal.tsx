import { cycleIndex, get, getFocusableEl, set } from '@libs/utils';
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
import { RESET } from 'jotai/utils';
import type { Direction } from '@modules/App/types';

function moveCursorListModal(step: number): void {
  const data = get($listModalDataset);
  const name = get($listModalActiveEntryName);
  const index = data.findIndex((d) => d.value === name);
  const next = index !== -1 ? cycleIndex(index, step, data.length) : 0;
  set($listModalActiveEntryName, data[next].value);
}

function confirmPrimaryActionListModal(): void {
  const data = get($listModalDataset);
  const name = get($listModalActiveEntryName);
  const item = data.find((d) => d.value === name);
  const { primary } = get($listModalAction);
  primary(item);
  set($modal, RESET);
  set($listModalFilterQuery, RESET);
  focusDataFrame();
}

function confirmSecondaryActionListModal(): void {
  const data = get($listModalDataset);
  const name = get($listModalActiveEntryName);
  const item = data.find((d) => d.value === name);
  const { secondary } = get($listModalAction);
  secondary?.(item);
  set($modal, RESET);
  set($listModalFilterQuery, RESET);
  focusDataFrame();
}

function cancelActionListModal(): void {
  const data = get($listModalDataset);
  const name = get($listModalActiveEntryName);
  const item = data.find((d) => d.value === name);
  const { cancel } = get($listModalAction);
  cancel?.(item);
  set($modal, RESET);
  set($listModalFilterQuery, RESET);
  focusDataFrame();
}

function clearListModalFilterQuery(): void {
  set($listModalFilterQuery, RESET);
}

function showPromptModal(defaultValue: string): Promise<string> {
  return new Promise((resolve) => {
    set($promptModalData, defaultValue);
    set($promptModalAction, {
      primary: (data) => resolve(data.trim()),
      cancel: () => resolve(''),
    });
    set($modal, <PromptModal />);
  });
}

function confirmActionPromptModal(): void {
  const data = get($promptModalData);
  const { primary } = get($promptModalAction);
  primary(data);
  set($modal, RESET);
  focusDataFrame();
}

function cancelActionPromptModal(): void {
  const data = get($promptModalData);
  const { cancel } = get($promptModalAction);
  cancel?.(data);
  set($modal, RESET);
  focusDataFrame();
}

function focusElementPromptModal(direction: Direction): void {
  const ref = get($modalRef);
  if (ref !== null) {
    getFocusableEl(ref, direction)?.focus();
  }
}

function showConfirmModal(message: string): Promise<string> {
  return new Promise((resolve) => {
    set($confirmModalAction, {
      primary: () => resolve('ok'),
      cancel: () => resolve(''),
    });
    set($modal, <ConfirmModal message={message} />);
  });
}

function confirmActionConfirmModal(): void {
  const { primary } = get($confirmModalAction);
  primary();
  set($modal, RESET);
  focusDataFrame();
}

function cancelActionConfirmModal(): void {
  const { cancel } = get($confirmModalAction);
  cancel?.();
  set($modal, RESET);
  focusDataFrame();
}

function focusElementConfirmModal(direction: Direction): void {
  const ref = get($modalRef);
  if (ref !== null) {
    getFocusableEl(ref, direction)?.focus();
  }
}

export {
  moveCursorListModal,
  confirmPrimaryActionListModal,
  confirmSecondaryActionListModal,
  cancelActionListModal,
  clearListModalFilterQuery,
  showPromptModal,
  confirmActionPromptModal,
  cancelActionPromptModal,
  focusElementPromptModal,
  showConfirmModal,
  confirmActionConfirmModal,
  cancelActionConfirmModal,
  focusElementConfirmModal,
};
