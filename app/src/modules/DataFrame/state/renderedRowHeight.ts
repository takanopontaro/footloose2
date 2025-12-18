import { atom } from 'jotai';
import { debounce, getCssVariable } from '@libs/utils';

/**
 * CSS カスタムプロパティで定義されている「行の高さ」を取得する。
 *
 * @returns 行の高さ
 */
function getRowHeight(): number {
  const n = parseInt(getCssVariable('--row-height'), 10);
  if (Number.isFinite(n)) {
    return n;
  }
  throw new Error('`--row-height` is not defined in your css');
}

/**
 * レンダリングされた時の行の高さ。
 * グリッドの表示領域関連の計算に使用される。
 * なお、この atom の setter は onMount からのみ呼び出される想定。
 */
export const $renderedRowHeight = atom(getRowHeight());

/**
 * メディアクエリ等で CSS カスタムプロパティの値が動的に変わる可能性があるため、
 * ウィンドウのリサイズを監視しておく。
 */
$renderedRowHeight.onMount = (set) => {
  const update = (): void => set(getRowHeight());
  update(); // 念のため…
  const fn = debounce(update, 200);
  window.addEventListener('resize', fn);
  return () => {
    fn.cancel();
    window.removeEventListener('resize', fn);
  };
};
