import { useAtom } from 'jotai';
import { memo, useEffect, useRef, useState } from 'react';
import { useModal } from '@modules/Modal/hooks';
import { $promptModalData } from '@modules/Modal/state';

import type { FC } from 'react';
import type { PromptTextSelection } from '@modules/Modal/types';

/**
 * PromptModal コンポーネントの props。
 */
type Props = {
  /**
   * モーダル内に表示する文字列。
   */
  message: string;
  /**
   * テキストフィールドの初期選択状態。
   */
  selection?: PromptTextSelection;
};

/**
 * 入力モーダルのコンポーネント。
 */
const PromptModalComponent: FC<Props> = ({ message, selection = 'none' }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useAtom($promptModalData);

  // data の初期値 (defaultValue) の拡張子ドットの位置。
  // 無いまたはドットから始まっている場合、文字列の終わり。
  const [dotIndex] = useState(() => {
    const index = data.lastIndexOf('.');
    return index === -1 || index === 0 ? data.length : index;
  });

  const { addTag, handleClose, handleFocus } = useModal(
    dialogRef,
    'PromptModal',
    'PromptModal:input',
  );

  useEffect(() => {
    inputRef.current?.focus();
    if (selection === 'all') {
      inputRef.current?.select();
      return;
    }
    if (selection === 'name') {
      inputRef.current?.setSelectionRange(0, dotIndex);
      return;
    }
  }, [dotIndex, selection]);

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
