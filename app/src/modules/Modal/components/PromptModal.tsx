import { useAtom, useSetAtom } from 'jotai';
import { RESET } from 'jotai/utils';
import { memo, useCallback, useEffect, useRef } from 'react';
import { $modal, $scope, $tags } from '@modules/App/state';
import { $modalRef, $promptModalData } from '@modules/Modal/state';

import type { FC, FocusEvent } from 'react';
import type { Tag } from '@modules/App/types';

const PromptModalComponent: FC = () => {
  const [scope, setScope] = useAtom($scope);
  const [data, setData] = useAtom($promptModalData);
  const setTags = useSetAtom($tags);
  const setModal = useSetAtom($modal);
  const setModalRef = useSetAtom($modalRef);
  const elRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    setModal(RESET);
  }, [setModal]);

  const handleFocus = useCallback(
    (e: FocusEvent) => {
      e.stopPropagation();
      setScope('PromptModal');
    },
    [setScope],
  );

  const addTag = useCallback(
    (tag: Tag) =>
      setTags((prev) => {
        prev = prev.filter((t) => !t.startsWith('PromptModal:'));
        return [...prev, tag];
      }),
    [setTags],
  );

  useEffect(() => {
    if (scope === 'PromptModal') {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [scope]);

  useEffect(() => {
    setModalRef(elRef.current);
  }, [setModalRef]);

  useEffect(() => {
    // アクセシビリティのため HTMLDialogElement.showModal() を使う。
    // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog#accessibility
    elRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={elRef}
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
