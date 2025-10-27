import { associations } from '@config/associations';
import { commands } from '@config/commands';
import { messages } from '@config/messages';
import { settings } from '@config/settings';
import { shortcuts } from '@config/shortcuts';

import type { Config } from '@modules/App/types';

/**
 * アプリケーションのデフォルト設定。
 */
const config: Config = {
  commands,
  shortcuts,
  messages,
  settings,
  associations,
};

export { config };
