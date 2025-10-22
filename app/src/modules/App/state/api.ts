import { atom } from 'jotai';
import * as appApi from '@modules/App/api';
import * as dataFrameApi from '@modules/DataFrame/api';
import * as logApi from '@modules/LogFrame/api';
import * as modalApi from '@modules/Modal/api';

import type { CommandAction } from '@modules/App/types';

/**
 * 各モジュールの API をまとめたオブジェクト。
 * コマンド実行関数も付随する。
 */
const apiMap = {
  ...appApi,
  ...dataFrameApi,
  ...logApi,
  ...modalApi,
  /**
   * コマンドを実行する。
   *
   * @param action - コマンドの実体関数
   * @param combo - 押下されたショートカットキーの組み合わせ
   * @param args - コマンド関数に渡される引数
   */
  async run(
    action: CommandAction,
    combo: string,
    args?: Record<string, unknown>,
  ) {
    await action(apiMap, combo, args);
  },
};

/**
 * API オブジェクト。
 * 読込専用 atom。
 */
export const $api = atom(() => apiMap);
