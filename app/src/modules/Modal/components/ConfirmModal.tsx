import { $modal, $scope, $tags } from '@modules/App/state';
import { $modalRef } from '@modules/Modal/state';
import { useAtom, useSetAtom } from 'jotai';
import { RESET } from 'jotai/utils';
import { memo, useCallback, useEffect, useRef } from 'react';
import type { Tag } from '@modules/App/types';
import type { FC, FocusEvent } from 'react';

type Props = {
  message: string;
};

const ConfirmModalComponent: FC<Props> = ({ message }) => {
  const [scope, setScope] = useAtom($scope);
  const setTags = useSetAtom($tags);
  const setModal = useSetAtom($modal);
  const setModalRef = useSetAtom($modalRef);
  const elRef = useRef<HTMLDialogElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleClose = useCallback(() => {
    setModal(RESET);
  }, [setModal]);

  const handleFocus = useCallback(
    (e: FocusEvent) => {
      e.stopPropagation();
      setScope('ConfirmModal');
    },
    [setScope],
  );

  const addTag = useCallback(
    (tag: Tag) =>
      setTags((prev) => {
        prev = prev.filter((t) => !t.startsWith('ConfirmModal:'));
        return [...prev, tag];
      }),
    [setTags],
  );

  useEffect(() => {
    if (scope === 'ConfirmModal') {
      btnRef.current?.focus();
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
      data-type="confirm"
      tabIndex={-1}
      onClose={handleClose}
      onFocus={handleFocus}
    >
      <div className="dialog_confirm">
        <div className="dialog_confirmMessage">{message}</div>
        <div className="dialog_confirmFooter">
          <button
            ref={btnRef}
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
