export type ModalCancelFn = () => void;

export type ListModalData = { label: string; value: string };

export type ListModalFn = (data?: ListModalData) => void;

export type ListModalAction = {
  cancel?: ModalCancelFn;
  primary: ListModalFn;
  secondary?: ListModalFn;
};

export type PromptModalFn = (data: string) => void;

export type PromptModalAction = {
  cancel?: ModalCancelFn;
  primary: PromptModalFn;
};

export type ConfirmModalFn = () => void;

export type ConfirmModalAction = {
  cancel?: ModalCancelFn;
  primary: ConfirmModalFn;
};
