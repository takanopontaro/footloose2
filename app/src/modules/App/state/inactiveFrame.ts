import { atom } from 'jotai';
import { $activeFrame } from '@modules/App/state';
import { getOtherFrame } from '@modules/DataFrame/libs';

/**
 * 非アクティブなフレーム。
 */
export const $inactiveFrame = atom((get) => getOtherFrame(get($activeFrame)));
