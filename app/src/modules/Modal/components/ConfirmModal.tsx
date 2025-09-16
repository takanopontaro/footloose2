import { memo, useRef } from 'react';
import { useModal } from '@modules/Modal/hooks';

import type { FC } from 'react';

type Props = {
  message: string;
};

const ConfirmModalComponent: FC<Props> = ({ message }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const { addTag, handleClose, handleFocus } = useModal(
    dialogRef,
    'ConfirmModal',
    'ConfirmModal:cancel',
  );

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      data-type="confirm"
      tabIndex={-1}
      onClose={handleClose}
      onFocus={handleFocus}
    >
      <div className="dialog_confirm">
        <div className="dialog_confirmMessage">{message}</div>
        <div className="dialog_confirmFooter">
          <button
            className="dialog_confirmBtn dialog_confirmBtn-cancel"
            tabIndex={-1}
            type="button"
            onFocus={() => addTag('ConfirmModal:cancel')}
          >
            Cancel
          </button>
          <button
            className="dialog_confirmBtn dialog_confirmBtn-confirm"
            tabIndex={-1}
            type="button"
            onFocus={() => addTag('ConfirmModal:confirm')}
          >
            OK
          </button>
        </div>
      </div>
    </dialog>
  );
};

export const ConfirmModal = memo(ConfirmModalComponent);
