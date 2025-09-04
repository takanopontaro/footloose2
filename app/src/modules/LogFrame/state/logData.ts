import { atom } from 'jotai';
import { RESET, atomWithReset } from 'jotai/utils';
import { $config } from '@modules/App/state';

import type { LogData } from '@modules/LogFrame/types';

const logDataAtom = atomWithReset<LogData[]>([]);

export const $logData = atom(
  (get) => get(logDataAtom),
  // newVal として、単体の LogData もしくは LogData[] の updater を
  // 受け取る特殊な IF になっている。
  // これはログ追加の際に uid を自動で払い出したいためである。
  // newVal が LogData の場合は LogData[] への追加、
  // 関数の場合は LogData[] 自身の更新を行う。
  (
    get,
    set,
    newVal:
      | Omit<LogData, 'uid'>
      | ((prev: LogData[]) => LogData[])
      | typeof RESET,
  ) => {
    if (typeof newVal === 'function') {
      const curVal = get(logDataAtom);
      set(logDataAtom, newVal(curVal));
      return;
    }
    if (newVal === RESET) {
      set(logDataAtom, RESET);
      return;
    }
    const { settings } = get($config);
    const maxLog = settings.maxLogCount;
    const log = { ...newVal, uid: crypto.randomUUID() };
    set(logDataAtom, (prev) => [...prev, log].slice(-maxLog));
  },
);
