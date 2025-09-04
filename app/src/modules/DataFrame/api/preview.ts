import { get, set } from '@libs/utils';
import { $activeFrame, $config, $modes } from '@modules/App/state';
import { $previewRef } from '@modules/DataFrame/state';

import type { Direction } from '@modules/App/types';

function isIframe(el: HTMLElement): el is HTMLIFrameElement {
  return el instanceof HTMLIFrameElement;
}

function isVideo(el: HTMLElement): el is HTMLVideoElement {
  return el instanceof HTMLVideoElement;
}

function showPreviewArea(frame = get($activeFrame)): void {
  set($modes(frame), (prev) => [...prev, 'preview']);
}

function hidePreviewArea(frame = get($activeFrame)): void {
  set($modes(frame), (prev) => prev.filter((m) => m !== 'preview'));
}

function scrollPreviewArea(step: number, frame = get($activeFrame)): void {
  const ref = get($previewRef(frame));
  if (ref !== null && isIframe(ref)) {
    const { settings } = get($config);
    const delta = step * settings.previewScrollAmount;
    ref.contentWindow?.scrollBy(0, delta);
  }
}

function scrollByPagePreviewArea(
  direction: Direction,
  frame = get($activeFrame),
): void {
  const ref = get($previewRef(frame));
  if (ref !== null && isIframe(ref)) {
    const delta = ref.offsetHeight * direction;
    ref.contentWindow?.scrollBy(0, delta);
  }
}

function scrollToEdgePreviewArea(
  direction: Direction,
  frame = get($activeFrame),
): void {
  const ref = get($previewRef(frame));
  if (ref !== null && isIframe(ref)) {
    const sh = ref.contentDocument?.documentElement.scrollHeight ?? 999999;
    const delta = direction === 1 ? sh : 0;
    ref.contentWindow?.scrollBy(0, delta);
  }
}

function getVideoElementPreviewArea(
  frame = get($activeFrame),
): HTMLVideoElement | null {
  const ref = get($previewRef(frame));
  return ref !== null && isVideo(ref) ? ref : null;
}

export {
  showPreviewArea,
  hidePreviewArea,
  scrollPreviewArea,
  scrollByPagePreviewArea,
  scrollToEdgePreviewArea,
  getVideoElementPreviewArea,
};
