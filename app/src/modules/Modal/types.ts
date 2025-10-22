/**
 * モーダルを閉じた時に実行される関数。
 * キャンセルボタンや ESC キー押下時に実行される。
 */
export type ModalCancelFn = () => void;

/**
 * ListModal に表示するデータ。
 */
export type ListModalData = {
  /**
   * 表示名。
   */
  label: string;
  /**
   * 値。
   */
  value: string;
};

/**
 * ListModal で項目選択を確定した時に実行される関数。
 *
 * @param data - 選択されたデータ
 */
export type ListModalFn = (data?: ListModalData) => void;

/**
 * ListModal のアクション設定。
 */
export type ListModalAction = {
  /**
   * キャンセル時に実行される関数。
   */
  cancel?: ModalCancelFn;
  /**
   * 確定時に実行される関数 (プライマリ)。
   */
  primary: ListModalFn;
  /**
   * 確定時に実行される関数 (セカンダリ)。
   */
  secondary?: ListModalFn;
};

/**
 * PromptModal で入力を確定した時に実行される関数。
 *
 * @param data - 入力されたデータ
 */
export type PromptModalFn = (data: string) => void;

/**
 * PromptModal のアクション設定。
 */
export type PromptModalAction = {
  /**
   * キャンセル時に実行される関数。
   */
  cancel?: ModalCancelFn;
  /**
   * 確定時に実行される関数。
   */
  primary: PromptModalFn;
};

/**
 * ConfirmModal で確定時に実行される関数。
 */
export type ConfirmModalFn = () => void;

/**
 * ConfirmModal のアクション設定。
 */
export type ConfirmModalAction = {
  /**
   * キャンセル時に実行される関数。
   */
  cancel?: ModalCancelFn;
  /**
   * 確定時に実行される関数。
   */
  primary: ConfirmModalFn;
};
