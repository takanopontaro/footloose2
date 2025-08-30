import { getDefaultStore } from 'jotai';
import type { Direction } from '@modules/App/types';

const { get, set } = getDefaultStore();

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

function shallowEqualArray(a: unknown[], b: unknown[]): boolean {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

function getEl<T extends HTMLElement = HTMLElement>(
  selector: string,
): T | null {
  return document.querySelector<T>(selector) ?? null;
}

function getFocusableEl(
  container: HTMLElement,
  direction: Direction,
): HTMLElement | null {
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
  if (index !== -1) {
    const next = cycleIndex(index, direction, elements.length);
    return elements[next];
  }
  return direction === 1 ? elements[0] : elements[elements.length - 1];
}

function getCssVariable(name: string): string {
  const root = document.documentElement;
  return getComputedStyle(root).getPropertyValue(name).trim();
}

// インデックスを循環させる
// 最小値を下回ると最大値に、最大値を上回ると最小値に戻る
function cycleIndex(
  curIndex: number,
  delta: number,
  totalItems: number,
): number {
  return (curIndex + delta + totalItems) % totalItems;
}

export {
  get,
  set,
  shallowEqualObject,
  shallowEqualArray,
  getEl,
  getFocusableEl,
  getCssVariable,
  cycleIndex,
};
