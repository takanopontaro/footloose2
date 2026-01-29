import { readState, writeState } from '@libs/utils';
import { $listModalMatchMode } from '@modules/Modal/state';

/**
 * ListModal のマッチモードを normal にする。
 */
function setNormalMatchModeListModal(): void {
  writeState($listModalMatchMode, 'normal');
}

/**
 * ListModal のマッチモードを regex にする。
 */
function setRegexMatchModeListModal(): void {
  writeState($listModalMatchMode, 'regex');
}

/**
 * ListModal のマッチモードを migemo にする。
 */
function setMigemoMatchModeListModal(): void {
  writeState($listModalMatchMode, 'migemo');
}

/**
 * ListModal のマッチモードを循環させる。
 * normal → regex → migemo → normal、の順。
 */
function cycleMatchModeListModal(): void {
  const mode = readState($listModalMatchMode);
  switch (mode) {
    case 'normal':
      setRegexMatchModeListModal();
      break;
    case 'regex':
      setMigemoMatchModeListModal();
      break;
    case 'migemo':
      setNormalMatchModeListModal();
      break;
  }
}

export {
  setNormalMatchModeListModal,
  setRegexMatchModeListModal,
  setMigemoMatchModeListModal,
  cycleMatchModeListModal,
};
