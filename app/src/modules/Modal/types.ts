export type ListModalData = { label: string; value: string };

export type ListModalFn = (data?: ListModalData) => void;

export type ListModalAction = {
  cancel?: ListModalFn;
  primary: ListModalFn;
  secondary?: ListModalFn;
};

export type PromptModalFn = (data: string) => void;

export type PromptModalAction = {
  cancel?: PromptModalFn;
  primary: PromptModalFn;
};

export type ConfirmModalFn = () => void;

export type ConfirmModalAction = {
  cancel?: ConfirmModalFn;
  primary: ConfirmModalFn;
};
