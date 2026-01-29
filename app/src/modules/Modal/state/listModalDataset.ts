import { atom } from 'jotai';
import { RESET, atomWithReset } from 'jotai/utils';
import { buildRegexStr } from '@modules/DataFrame/libs';
import {
  $listModalFilterQuery,
  $listModalMatchMode,
} from '@modules/Modal/state';

import type { SetStateAction } from 'jotai';
import type { ListModalData } from '@modules/Modal/types';

const listModalDatasetAtom = atomWithReset<ListModalData[]>([]);

/**
 * ListModal に表示するデータ。
 * get 時は filter-out されたものを返す。
 */
export const $listModalDataset = atom(
  (get) => {
    let dataset = get(listModalDatasetAtom);
    const filter = get($listModalFilterQuery);
    if (filter !== '') {
      // パターン入力中の場合を考慮して、
      // 無効な正規表現の場合は catch 句で握りつぶす
      try {
        const matchMode = get($listModalMatchMode);
        const pattern = buildRegexStr(filter, matchMode);
        const re = new RegExp(pattern, 'i');
        dataset = dataset.filter((v) => re.test(v.label));
      } catch (_e) {
        // 握りつぶす ✊💥
      }
    }
    return dataset;
  },
  (get, set, newVal: SetStateAction<ListModalData[]> | typeof RESET) => {
    if (typeof newVal === 'function') {
      const curVal = get(listModalDatasetAtom);
      newVal = newVal(curVal);
    }
    if (newVal === RESET || newVal.length === 0) {
      set(listModalDatasetAtom, RESET);
      return;
    }
    // ここで newVal と curVal の同一性チェックを入れようと考えたが、
    // 比較のコストが馬鹿にならないため、やらないことにした。
    set(listModalDatasetAtom, newVal);
  },
);
