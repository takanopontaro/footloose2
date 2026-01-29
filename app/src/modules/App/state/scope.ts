import { atom } from 'jotai';
import Mousetrap from 'mousetrap';
import { readState } from '@libs/utils';
import { $activeFrame, $api, $config, $tags } from '@modules/App/state';
import { $modes } from '@modules/DataFrame/state';

import type { SetStateAction } from 'jotai';
import type {
  CommandAction,
  Scope,
  ShortcutCommand,
  Tag,
} from '@modules/App/types';
import type { Mode } from '@modules/DataFrame/types';

type ActionsConfig = Omit<ShortcutCommand, 'cmd'> & {
  action: CommandAction;
};

/**
 * コマンドオブジェクトを元に、そのコマンドの関数本体を取得し、
 * 元の設定と組み合わせて返す。
 *
 * @param shortcutCommandList - ShortcutCommand のリスト
 * @returns コマンドの関数本体を含む設定のリスト
 */
function getActionsConfigList(
  shortcutCommandList: ShortcutCommand[],
): ActionsConfig[] {
  const { commands } = readState($config);
  const res: ActionsConfig[] = [];
  for (const { args, cmd, modes, tags } of shortcutCommandList) {
    const action = commands.find((v) => v.name === cmd)?.action;
    if (action) {
      res.push({ action, args, modes, tags });
    }
  }
  return res;
}

/**
 * その値が集合に含まれるか否かを判定する。
 * 先頭に ! が付いている場合は、含まれないことを判定する。
 *
 * @param value - 判定する値
 * @param curValues - 集合
 * @returns 含まれるか否か
 */
function match<T>(value: string, curValues: T[]): boolean {
  if (value.startsWith('!')) {
    const v = value.slice(1);
    return !curValues.includes(v as T);
  }
  return curValues.includes(value as T);
}

/**
 * 現在のモードやタグに基づいた、適切なコマンドを取得する関数を返す。
 *
 * @param shortcutCommandList - ShortcutCommand のリスト
 * @returns コマンド取得関数
 */
function makeGetAvailableActions(
  shortcutCommandList: ShortcutCommand[],
): () => ActionsConfig[] {
  const configs = getActionsConfigList(shortcutCommandList);
  return () => {
    const frame = readState($activeFrame);
    const curModes = readState($modes(frame));
    const curTags = readState($tags);
    return configs
      .map((c) => {
        const isInMode = c.modes?.some((m) => match<Mode>(m, curModes));
        const hasTag = c.tags?.some((t) => match<Tag>(t, curTags));
        return isInMode !== false && hasTag !== false ? c : null;
      })
      .filter((c) => c !== null);
  };
}

const scopeAtom = atom<Scope>('');

/**
 * スコープ。
 */
export const $scope = atom(
  (get) => get(scopeAtom),
  (get, set, newVal: SetStateAction<Scope>) => {
    const curVal = get(scopeAtom);
    if (typeof newVal === 'function') {
      newVal = newVal(curVal);
    }
    if (newVal === curVal) {
      return;
    }
    set(scopeAtom, newVal);

    // ------------------------------------
    // スコープに紐づいたショートカットキーを設定する。

    Mousetrap.reset();

    const api = get($api);
    const { shortcuts } = get($config);
    const bindings = shortcuts[newVal] ?? {};

    for (const [key, shortcutCommandList] of Object.entries(bindings)) {
      const getAvailableActions = makeGetAvailableActions(shortcutCommandList);
      Mousetrap.bind(key, (_e, combo) => {
        const actions = getAvailableActions();
        (async () => {
          for (const { action, args } of actions) {
            await api.run(action, combo, args);
          }
        })().catch(() => {});
        // コマンドが実行された場合は false を返し、
        // イベントの伝播とブラウザのデフォルト挙動を止める。
        const executed = actions.length > 0;
        return !executed;
      });
    }
  },
);
