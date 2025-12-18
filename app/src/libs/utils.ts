import { store } from '@libs/store';

import type { Direction } from '@modules/App/types';

/**
 * jotai の setter と getter。
 * フックとは違い、React のライフサイクルとは関係なく即反映される。
 */
const { get: readState, set: writeState } = store;

/**
 * ふたつのオブジェクトが同じか否か、浅い比較を行う。
 *
 * @param a - 比較対象のオブジェクト
 * @param b - 比較対象のオブジェクト
 * @returns 同じか否か
 */
function shallowEqualObject(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  if (a === b) {
    return true;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) {
    return false;
  }
  for (const key of keysA) {
    if (a[key] !== b[key]) {
      return false;
    }
  }
  return true;
}

/**
 * ふたつの配列が同じか否か、浅い比較を行う。
 *
 * @param a - 比較対象の配列
 * @param b - 比較対象の配列
 * @returns 同じか否か
 */
function shallowEqualArray(a: unknown[], b: unknown[]): boolean {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * 対象エリア内のフォーカス可能な要素を、移動方向に基づいて返す。
 * 最初の要素の逆方向は最後の要素、最後の要素の順方向は最初の要素、
 * というように循環して返す。
 *
 * @param container - 対象のコンテナ要素
 * @param direction - 移動方向
 * @returns フォーカス可能な要素または null
 */
function getFocusableEl(
  container: HTMLElement,
  direction: Direction,
): HTMLElement | null {
  // フォーカス可能な要素のセレクター
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
  ];

  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(selectors.join(',')),
  );
  if (elements.length === 0) {
    return null;
  }

  const activeEl = document.activeElement as HTMLElement | null;
  const index = activeEl ? elements.indexOf(activeEl) : -1;

  // 以下の場合、移動方向に基づいたフォーカス可能要素を返す。
  // (初期フォーカス用として使用される想定)
  // - どの要素にもフォーカスが当たっていない
  // - 当たってはいるがその要素が対象エリア内にない
  if (index === -1) {
    return direction === 1 ? elements[0] : elements[elements.length - 1];
  }

  // 移動方向 (1 | -1) を移動量として再利用する。
  const delta = direction;
  const newIndex = cycleIndex(index, delta, elements.length);
  return elements[newIndex];
}

/**
 * CSS カスタムプロパティを取得する。
 * そのプロパティが未設定の場合は空文字を返す。
 *
 * @param name - カスタムプロパティの名前
 * @returns カスタムプロパティの値または空文字
 */
function getCssVariable(name: string): string {
  const root = document.documentElement;
  return getComputedStyle(root).getPropertyValue(name).trim();
}

/**
 * インデックスを循環させる。
 * 最小値を下回ると最大値に、最大値を上回ると最小値に戻る。
 *
 * @param curIndex - 現在のインデックス
 * @param delta - 移動量
 * @param totalItems - アイテムの総数
 * @returns 循環後のインデックス
 */
function cycleIndex(
  curIndex: number,
  delta: number,
  totalItems: number,
): number {
  return (((curIndex + delta) % totalItems) + totalItems) % totalItems;
}

/**
 * 関数型。
 */
type Fn = (...args: unknown[]) => unknown;

/**
 * cancel 付きの、debounce された関数型。
 */
type Debounced<T extends Fn> = ((
  this: ThisParameterType<T>,
  ...args: Parameters<T>
) => void) & {
  cancel: () => void;
};

/**
 * 指定された関数を debounce する。
 *
 * @param fn - 対象の関数
 * @param delay - 実行までの待ち時間 (ミリ秒)
 */
function debounce<T extends Fn>(fn: T, delay: number): Debounced<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const debounced: Debounced<T> = function (this, ...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
  debounced.cancel = () => clearTimeout(timeout);
  return debounced;
}

export {
  readState,
  writeState,
  shallowEqualObject,
  shallowEqualArray,
  getFocusableEl,
  getCssVariable,
  cycleIndex,
  debounce,
};
