import { useAtom } from 'jotai';
import { memo, useEffect, useRef } from 'react';
import { useModal } from '@modules/Modal/hooks';
import { $promptModalData } from '@modules/Modal/state';

import type { FC } from 'react';

/**
 * PromptModal コンポーネントの props。
 */
type Props = {
  /**
   * モーダル内に表示する文字列。
   */
  message: string;
};

/**
 * 入力モーダルのコンポーネント。
 */
const PromptModalComponent: FC<Props> = ({ message }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useAtom($promptModalData);

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
        <div className="dialog_promptMessage">{message}</div>
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
          />
          <button
            className="dialog_promptBtn dialog_promptBtn-confirm"
            tabIndex={-1}
            type="button"
            onFocus={() => addTag('PromptModal:confirm')}
          />
        </div>
      </div>
    </dialog>
  );
};

export const PromptModal = memo(PromptModalComponent);
