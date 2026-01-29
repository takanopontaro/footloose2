import { readState, writeState } from '@libs/utils';
import { $activeFrame, $config } from '@modules/App/state';
import { $previewRef, $modes } from '@modules/DataFrame/state';

import type { Direction } from '@modules/App/types';

/**
 * iframe 要素か否かを返す型ガード。
 *
 * @param el - 要素または null
 * @returns iframe か否か
 */
function isIframe(el: HTMLElement | null): el is HTMLIFrameElement {
  return el instanceof HTMLIFrameElement;
}

/**
 * video 要素か否かを返す型ガード。
 *
 * @param el - 要素または null
 * @returns video か否か
 */
function isVideo(el: HTMLElement | null): el is HTMLVideoElement {
  return el instanceof HTMLVideoElement;
}

/**
 * preview モードに入る。
 * CSS によりプレビューエリアが表示される。
 *
 * @param frame - 対象フレーム
 */
function showPreviewArea(frame = readState($activeFrame)): void {
  writeState($modes(frame), (prev) => [...prev, 'preview']);
}

/**
 * preview モードを終了する。
 * CSS によりプレビューエリアが非表示になる。
 *
 * @param frame - 対象フレーム
 */
function hidePreviewArea(frame = readState($activeFrame)): void {
  writeState($modes(frame), (prev) => prev.filter((m) => m !== 'preview'));
}

/**
 * プレビューエリアをスクロールする。
 * スクロール量は Config の previewScrollAmount に準拠する。
 *
 * @param step - スクロール量の基底値
 * @param frame - 対象フレーム
 */
function scrollPreviewArea(
  step: number,
  frame = readState($activeFrame),
): void {
  const ref = readState($previewRef(frame));
  if (isIframe(ref)) {
    const { settings } = readState($config);
    const delta = step * settings.previewScrollAmount;
    ref.contentWindow?.scrollBy(0, delta);
  }
}

/**
 * プレビューエリアをページ単位でスクロールする。
 *
 * @param direction - スクロール方向
 * @param frame - 対象フレーム
 */
function scrollByPagePreviewArea(
  direction: Direction,
  frame = readState($activeFrame),
): void {
  const ref = readState($previewRef(frame));
  if (isIframe(ref)) {
    const delta = ref.offsetHeight * direction;
    ref.contentWindow?.scrollBy(0, delta);
  }
}

/**
 * プレビューエリアを端までスクロールする。
 *
 * @param direction - スクロール方向
 * @param frame - 対象フレーム
 */
function scrollToEdgePreviewArea(
  direction: Direction,
  frame = readState($activeFrame),
): void {
  const ref = readState($previewRef(frame));
  if (isIframe(ref)) {
    // scrollHeight が取れない場合は非常に大きな値にしておく。
    const sh = ref.contentDocument?.documentElement.scrollHeight ?? 999999;
    const delta = direction === 1 ? sh : 0;
    ref.contentWindow?.scrollBy(0, delta);
  }
}

/**
 * プレビューエリアの video 要素を取得する。
 * 無ければ null を返す。
 *
 * @param frame - 対象フレーム
 * @returns video または null
 */
function getVideoElementPreviewArea(
  frame = readState($activeFrame),
): HTMLVideoElement | null {
  const ref = readState($previewRef(frame));
  return isVideo(ref) ? ref : null;
}

export {
  showPreviewArea,
  hidePreviewArea,
  scrollPreviewArea,
  scrollByPagePreviewArea,
  scrollToEdgePreviewArea,
  getVideoElementPreviewArea,
};
