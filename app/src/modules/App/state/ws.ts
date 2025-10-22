import { atom } from 'jotai';
import { Ws } from '@libs/ws';

/**
 * Ws クラスのインスタンス。
 */
export const $ws = atom(() => Ws);
