import { atom } from 'jotai';
import { Ws } from '@libs/ws';

export const $ws = atom(() => Ws);
