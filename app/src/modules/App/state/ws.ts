import { Ws } from '@libs/ws';
import { atom } from 'jotai';

export const $ws = atom(() => Ws);
