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

function moveCursorListModal(step: number): void {
  const data = readState($listModalDataset);
  const name = readState($listModalActiveEntryName);
  const index = data.findIndex((d) => d.value === name);
  const next = index !== -1 ? cycleIndex(index, step, data.length) : 0;
  writeState($listModalActiveEntryName, data[next].value);
}

function confirmPrimaryActionListModal(): void {
  const data = readState($listModalDataset);
  const name = readState($listModalActiveEntryName);
  const item = data.find((d) => d.value === name);
  const { primary } = readState($listModalAction);
  primary(item);
  writeState($modal, RESET);
  writeState($listModalFilterQuery, RESET);
  focusDataFrame();
}

function confirmSecondaryActionListModal(): void {
  const data = readState($listModalDataset);
  const name = readState($listModalActiveEntryName);
  const item = data.find((d) => d.value === name);
  const { secondary } = readState($listModalAction);
  secondary?.(item);
  writeState($modal, RESET);
  writeState($listModalFilterQuery, RESET);
  focusDataFrame();
}

function cancelActionListModal(): void {
  const data = readState($listModalDataset);
  const name = readState($listModalActiveEntryName);
  const item = data.find((d) => d.value === name);
  const { cancel } = readState($listModalAction);
  cancel?.(item);
  writeState($modal, RESET);
  writeState($listModalFilterQuery, RESET);
  focusDataFrame();
}

function clearListModalFilterQuery(): void {
  writeState($listModalFilterQuery, RESET);
}

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

function confirmActionPromptModal(): void {
  const data = readState($promptModalData);
  const { primary } = readState($promptModalAction);
  primary(data);
  writeState($modal, RESET);
  focusDataFrame();
}

function cancelActionPromptModal(): void {
  const data = readState($promptModalData);
  const { cancel } = readState($promptModalAction);
  cancel?.(data);
  writeState($modal, RESET);
  focusDataFrame();
}

function focusElementPromptModal(direction: Direction): void {
  const ref = readState($modalRef);
  if (ref !== null) {
    getFocusableEl(ref, direction)?.focus();
  }
}

function showConfirmModal(message: string): Promise<string> {
  return new Promise((resolve) => {
    writeState($confirmModalAction, {
      primary: () => resolve('ok'),
      cancel: () => resolve(''),
    });
    writeState($modal, <ConfirmModal message={message} />);
  });
}

function confirmActionConfirmModal(): void {
  const { primary } = readState($confirmModalAction);
  primary();
  writeState($modal, RESET);
  focusDataFrame();
}

function cancelActionConfirmModal(): void {
  const { cancel } = readState($confirmModalAction);
  cancel?.();
  writeState($modal, RESET);
  focusDataFrame();
}

function focusElementConfirmModal(direction: Direction): void {
  const ref = readState($modalRef);
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
