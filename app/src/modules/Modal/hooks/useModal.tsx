import { useSetAtom } from 'jotai';
import { RESET } from 'jotai/utils';
import { useCallback, useEffect } from 'react';
import { $modal, $scope, $tags } from '@modules/App/state';
import { $modalRef } from '@modules/Modal/state';

import type { FocusEvent, RefObject } from 'react';
import type { Scope, Tag } from '@modules/App/types';

type ReturnValue = {
  addTag: (tag: Tag) => void;
  clearAllRelatedTags: () => void;
  handleClose: () => void;
  handleFocus: (e: FocusEvent) => void;
};

/**
 * モーダル操作系の共通処理を行う。
 */
export const useModal = (
  dialogRef: RefObject<HTMLDialogElement | null>,
  scope: Scope,
  initTag: Tag,
): ReturnValue => {
  const setModal = useSetAtom($modal);
  const setModalRef = useSetAtom($modalRef);
  const setScope = useSetAtom($scope);
  const setTags = useSetAtom($tags);

  // モーダルは API を使って閉じる想定だが、
  // ESC に何もバインドしていない場合、デフォルト挙動としてモーダルが閉じる。
  // その時にこのハンドラが呼ばれる。
  const handleClose = useCallback(() => {
    setModal(RESET);
  }, [setModal]);

  const handleFocus = useCallback(
    (e: FocusEvent) => {
      e.stopPropagation();
      setScope(scope);
    },
    [scope, setScope],
  );

  // タグ配列からこのモーダルに関連するタグをすべて削除して返す。
  // タグは scope:xxxx の形式になっている。
  const clearTags = useCallback(
    (tags: Tag[]) => tags.filter((t) => !t.startsWith(`${scope}:`)),
    [scope],
  );

  // タグを追加する。
  // モーダル関連のタグは排他のため、関連するタグを最初にすべて削除する。
  const addTag = useCallback(
    (tag: Tag) =>
      setTags((prev) => {
        prev = clearTags(prev);
        return [...prev, tag];
      }),
    [clearTags, setTags],
  );

  // このモーダルに関連するタグをすべて削除する。
  const clearAllRelatedTags = useCallback(
    () => setTags((prev) => clearTags(prev)),
    [clearTags, setTags],
  );

  // HTMLDialogElement.showModal() で dialog を開いた時は、
  // focusable な最初の要素に自動的にフォーカスが当たる。
  // コーディングルールとして、その要素には onFocus が設定されていて、
  // addTag でタグをセットする処理が書かれている。
  // そのため initTag は本来不要なはずだが、開発時は useEffect が
  // 二度呼ばれる関係でタグがうまくセットされない。
  // これを考慮して、initTag を使用している。
  useEffect(() => {
    addTag(initTag);
    return () => {
      clearAllRelatedTags();
    };
  }, [addTag, clearAllRelatedTags, initTag]);

  useEffect(() => {
    setModalRef(dialogRef.current);
    return () => {
      setModalRef(RESET);
    };
  }, [dialogRef, setModalRef]);

  // mount 時にモーダルを開く。
  // アクセシビリティのため HTMLDialogElement.showModal() を使う。
  // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog#accessibility
  useEffect(() => {
    dialogRef.current?.showModal();
  }, [dialogRef]);

  return { addTag, clearAllRelatedTags, handleClose, handleFocus };
};
