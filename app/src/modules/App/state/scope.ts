import { atom } from 'jotai';
import Mousetrap from 'mousetrap';
import { $activeFrame, $api, $config, $modes, $tags } from '@modules/App/state';

import type { SetStateAction } from 'jotai';
import type {
  CommandAction,
  Mode,
  Scope,
  ShortcutCommand,
  Tag,
} from '@modules/App/types';

type ShortcutAction = Omit<ShortcutCommand, 'cmd'> & {
  action: CommandAction;
};

function isShortcutAction(item: unknown): item is ShortcutAction {
  return item !== null;
}

function isMatch<T>(value: string, curValues: T[]): boolean {
  if (value.startsWith('!')) {
    const v = value.slice(1);
    return !curValues.includes(v as T);
  }
  return curValues.includes(value as T);
}

const scopeAtom = atom<Scope>('');

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

    Mousetrap.reset();
    const api = get($api);
    const { commands, shortcuts } = get($config);
    const bindings = shortcuts[newVal] ?? {};
    Object.entries(bindings).forEach(([key, cmdList]) => {
      const actionMap = cmdList.reduce<ShortcutAction[]>(
        (map, { args, cmd, modes, tags }) => {
          const fn = commands.find((v) => v.name === cmd)?.action;
          if (fn) {
            map.push({ action: fn, args, modes, tags });
          }
          return map;
        },
        [],
      );
      Mousetrap.bind(key, (_e, combo) => {
        const frame = get($activeFrame);
        const curModes = get($modes(frame));
        const curTags = get($tags);
        const actions = actionMap
          .map((map) => {
            const isInMode = map.modes?.some((m) => isMatch<Mode>(m, curModes));
            const hasTag = map.tags?.some((t) => isMatch<Tag>(t, curTags));
            return isInMode !== false && hasTag !== false ? map : null;
          })
          .filter(isShortcutAction);
        (async () => {
          for (const { action, args } of actions) {
            await api.run(action, combo, args);
          }
        })().catch(() => {});
        const executed = actions.length > 0;
        return !executed;
      });
    });
  },
);
