/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { associations } from '@config/associations';
import { commands } from '@config/commands';
import { messages } from '@config/messages';
import { settings } from '@config/settings';
import { shortcuts } from '@config/shortcuts';
import type { Config } from '@modules/App/types';

const config: Config = {
  commands,
  shortcuts,
  messages,
  settings,
  associations,
};

export { config };
