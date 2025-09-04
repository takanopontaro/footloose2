import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { RESET } from 'jotai/utils';
import { memo, useCallback, useEffect, useRef } from 'react';
import { $modal, $scope, $tags } from '@modules/App/state';
import {
  $listModalActiveEntryName,
  $listModalDataset,
  $listModalFilterQuery,
  $modalRef,
} from '@modules/Modal/state';

import type { FC, FocusEvent, FormEvent } from 'react';
import type { Tag } from '@modules/App/types';

type Props = {
  tag: Tag;
};

const ListModalComponent: FC<Props> = ({ tag }) => {
  const [scope, setScope] = useAtom($scope);
  const [filter, setFilter] = useAtom($listModalFilterQuery);
  const setTags = useSetAtom($tags);
  const setModal = useSetAtom($modal);
  const setModalRef = useSetAtom($modalRef);
  const currentRowName = useAtomValue($listModalActiveEntryName);
  const dataset = useAtomValue($listModalDataset);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInput = useCallback(
    (e: FormEvent<HTMLInputElement>) => setFilter(e.currentTarget.value),
    [setFilter],
  );

  const handleInputFocus = useCallback(
    (e: FocusEvent) => {
      e.stopPropagation();
      setScope('ListModalEntryFilter');
    },
    [setScope],
  );

  // モーダルは API を使って閉じる前提だが、
  // ESC に何もバインドしていない場合、デフォルト挙動としてモーダルが閉じる。
  // その時にこのハンドラが呼ばれる。
  const handleClose = useCallback(() => {
    setModal(RESET);
    setFilter(RESET);
  }, [setFilter, setModal]);

  const handleFocus = useCallback(
    (e: FocusEvent) => {
      e.stopPropagation();
      setScope('ListModal');
    },
    [setScope],
  );

  useEffect(() => {
    if (scope === 'ListModal') {
      dialogRef.current?.focus();
    }
    if (scope === 'ListModalEntryFilter') {
      inputRef.current?.focus();
    }
  }, [scope]);

  useEffect(() => {
    setTags((prev) => [...prev, tag]);
    return () => {
      setTags((prev) => prev.filter((t) => t !== tag));
    };
  }, [setTags, tag]);

  useEffect(() => {
    setModalRef(dialogRef.current);
    dialogRef.current?.showModal();
  }, [setModalRef]);

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      data-type="list"
      onClose={handleClose}
      onFocus={handleFocus}
    >
      <div className="dialog_filter">
        <input
          ref={inputRef}
          className="mousetrap dialog_input"
          tabIndex={-1}
          type="text"
          value={filter}
          onFocus={handleInputFocus}
          onInput={handleInput}
        />
      </div>
      <div className="dialog_list">
        {dataset.map(({ label, value }) => (
          <button
            key={value}
            aria-current={currentRowName === value}
            className="dialog_listItem"
            tabIndex={-1}
          >
            {label}
          </button>
        ))}
      </div>
    </dialog>
  );
};

export const ListModal = memo(ListModalComponent);
