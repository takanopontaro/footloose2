import { useAtom, useAtomValue } from 'jotai';
import { RESET } from 'jotai/utils';
import { memo, useCallback, useEffect, useRef } from 'react';
import { $scope } from '@modules/App/state';
import { useModal } from '@modules/Modal/hooks';
import {
  $listModalActiveEntryName,
  $listModalDataset,
  $listModalFilterQuery,
} from '@modules/Modal/state';

import type { FC, FocusEvent, FormEvent } from 'react';

/**
 * ListModal コンポーネントの props。
 */
type Props = {
  /**
   * モーダルを開いた時に付けるタグの接尾詞。
   */
  tag: 'bookmark' | 'history';
};

/**
 * リスト選択モーダルのコンポーネント。
 */
const ListModalComponent: FC<Props> = ({ tag }) => {
  const [scope, setScope] = useAtom($scope);
  const [filter, setFilter] = useAtom($listModalFilterQuery);
  const currentRowName = useAtomValue($listModalActiveEntryName);
  const dataset = useAtomValue($listModalDataset);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { handleClose, handleFocus } = useModal(
    dialogRef,
    'ListModal',
    `ListModal:${tag}`,
  );

  useEffect(() => {
    switch (scope) {
      case 'ListModal':
        dialogRef.current?.focus();
        break;
      case 'ListModalEntryFilter':
        inputRef.current?.focus();
        break;
    }
  }, [scope]);

  useEffect(() => {
    return () => setFilter(RESET);
  }, [setFilter]);

  // モーダルは API を使って閉じる想定だが、
  // ESC に何もバインドしていない場合、デフォルト挙動としてモーダルが閉じる。
  // その時にこのハンドラが呼ばれる。
  const handleModalClose = useCallback(() => {
    handleClose();
    setFilter(RESET);
  }, [handleClose, setFilter]);

  const handleInputFocus = useCallback(
    (e: FocusEvent) => {
      e.stopPropagation();
      setScope('ListModalEntryFilter');
    },
    [setScope],
  );

  const handleInput = useCallback(
    (e: FormEvent<HTMLInputElement>) => setFilter(e.currentTarget.value),
    [setFilter],
  );

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      data-type="list"
      onClose={handleModalClose}
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
