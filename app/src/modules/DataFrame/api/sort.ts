import { RESET } from 'jotai/utils';
import { readState, writeState } from '@libs/utils';
import { $activeFrame } from '@modules/App/state';
import { $sort } from '@modules/DataFrame/state';

import type { SortCriterion } from '@modules/DataFrame/types';

/**
 * エントリ一覧をソートする。
 *
 * @param field - 対象フィールド
 * @param order - ソート順
 * @param frame - 対象フレーム
 */
function sortEntries(
  field: SortCriterion['field'],
  order: SortCriterion['order'],
  frame = readState($activeFrame),
): void {
  writeState($sort(frame), (prev) => ({ ...prev, field, order }));
}

/**
 * エントリ一覧のソートを切り替える。
 * デフォルトは昇順で、降順と交互に切り替える。
 *
 * @param field - 対象フィールド
 * @param frame - 対象フレーム
 */
function cycleSortOrder(
  field: SortCriterion['field'],
  frame = readState($activeFrame),
): void {
  const curVal = readState($sort(frame));
  // 対象フィールドが現在のものと異なる場合は昇順 (デフォルト) でソートする。
  if (curVal.field !== field) {
    writeState($sort(frame), (prev) => ({ ...prev, field, order: 'asc' }));
    return;
  }
  // 同じフィールドの場合は昇順と降順を切り替える。
  writeState($sort(frame), (prev) => ({
    ...prev,
    order: curVal.order === 'asc' ? 'desc' : 'asc',
  }));
}

/**
 * エントリ一覧のソートを解除する。
 *
 * @param frame - 対象フレーム
 */
function clearSort(frame = readState($activeFrame)): void {
  writeState($sort(frame), RESET);
}

/**
 * ディレクトリの表示位置を設定する。
 * 上に集める、下に集める、何もしない、のみっつ。
 *
 * @param pos - ディレクトリの位置
 * @param frame - 対象フレーム
 */
function setDirPosition(
  pos: SortCriterion['dir'],
  frame = readState($activeFrame),
): void {
  writeState($sort(frame), (prev) => ({ ...prev, dir: pos }));
}

/**
 * ディレクトリの表示位置を切り替える。
 * 上 → 下 → 未設定 → 上、というように順番に切り替えていく。
 *
 * @param frame - 対象フレーム
 */
function cycleDirPosition(frame = readState($activeFrame)): void {
  writeState($sort(frame), (prev) => {
    const newPos =
      prev.dir === 'top' ? 'bottom' : prev.dir === 'bottom' ? 'none' : 'top';
    return { ...prev, dir: newPos };
  });
}

export {
  sortEntries,
  cycleSortOrder,
  clearSort,
  setDirPosition,
  cycleDirPosition,
};
