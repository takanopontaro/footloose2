import { $activeFrame } from '@modules/App/state';
import { getOtherFrame } from '@modules/DataFrame/libs';
import { atom } from 'jotai';

export const $inactiveFrame = atom((get) => getOtherFrame(get($activeFrame)));
