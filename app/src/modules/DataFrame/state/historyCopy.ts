import { atom } from 'jotai';
import { atomFamily, atomWithReset, RESET } from 'jotai/utils';
import { $modes } from '@modules/DataFrame/state';

import type { SetStateAction } from 'jotai';
import type { Frame } from '@modules/App/types';

const historyCopyAtom = atomFamily((_frame: Frame) =>
  atomWithReset<string[] | null>(null),
);

/**
 * 履歴のコピー。
 * history モード時に使用される。
 * このモードは実際のブラウザの挙動を模倣している。
 * 履歴を行ったり来たりすると履歴自身も随時更新される。
 * 例えば 0:A 1:B 2:C という履歴だった場合、今いるのは A である。
 * そしてひとつ戻って B に来ると履歴は 0:B 1:A 2:C となる。これは履歴としては正しい。
 * しかしこれだと、ひとつ戻る＝A と B を行ったり来たりする、ということになり、
 * 履歴を遡れないことになってしまう。
 * そこでメインの履歴とは別に、コピーを内部的に作成し、
 * 履歴の移動にはそちらのデータを使うようにする。
 * こうすることで履歴を行ったり来たりすることが可能になる。
 */
export const $historyCopy = atomFamily((frame: Frame) =>
  atom(
    (get) => get(historyCopyAtom(frame)),
    (get, set, newVal: SetStateAction<string[] | null> | typeof RESET) => {
      if (typeof newVal === 'function') {
        const curVal = get(historyCopyAtom(frame));
        newVal = newVal(curVal);
      }
      if (newVal === RESET || newVal === null) {
        set(historyCopyAtom(frame), RESET);
        set($modes(frame), (prev) => prev.filter((m) => m !== 'history'));
        return;
      }

      // ここで newVal と curVal の同一性チェックを入れようと考えたが、
      // 同じデータで setter が呼ばれる可能性が低いのと、
      // 比較のコストが馬鹿にならないため、やらないことにした。

      set(historyCopyAtom(frame), newVal);
      set($modes(frame), (prev) => [...prev, 'history']);
    },
  ),
);
