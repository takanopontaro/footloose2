import * as appApi from '@modules/App/api';
import * as dataFrameApi from '@modules/DataFrame/api';
import * as logApi from '@modules/LogFrame/api';
import * as modalApi from '@modules/Modal/api';
import { atom } from 'jotai';
import type { CommandAction } from '@modules/App/types';

const apiMap = {
  ...appApi,
  ...dataFrameApi,
  ...logApi,
  ...modalApi,
  async run(
    action: CommandAction,
    combo: string,
    args?: Record<string, unknown>,
  ) {
    await action(apiMap, combo, args);
  },
};

// read-only atom
export const $api = atom(() => apiMap);
