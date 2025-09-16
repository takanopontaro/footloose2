import { useAtom } from 'jotai';
import { memo, useEffect, useRef } from 'react';
import { useModal } from '@modules/Modal/hooks';
import { $promptModalData } from '@modules/Modal/state';

import type { FC } from 'react';

const PromptModalComponent: FC = () => {
  const [data, setData] = useAtom($promptModalData);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { addTag, handleClose, handleFocus } = useModal(
    dialogRef,
    'PromptModal',
    'PromptModal:input',
  );

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      data-type="prompt"
      tabIndex={-1}
      onClose={handleClose}
      onFocus={handleFocus}
    >
      <div className="dialog_prompt">
        <input
          ref={inputRef}
          className="mousetrap dialog_promptInput"
          tabIndex={-1}
          type="text"
          value={data}
          onChange={(e) => setData(e.target.value)}
          onFocus={() => addTag('PromptModal:input')}
        />
        <div className="dialog_promptFooter">
          <button
            className="dialog_promptBtn dialog_promptBtn-cancel"
            tabIndex={-1}
            type="button"
            onFocus={() => addTag('PromptModal:cancel')}
          >
            Cancel
          </button>
          <button
            className="dialog_promptBtn dialog_promptBtn-confirm"
            tabIndex={-1}
            type="button"
            onFocus={() => addTag('PromptModal:confirm')}
          >
            OK
          </button>
        </div>
      </div>
    </dialog>
  );
};

export const PromptModal = memo(PromptModalComponent);
