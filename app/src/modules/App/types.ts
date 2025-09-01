import type * as appApi from '@modules/App/api';
import type * as dataFrameApi from '@modules/DataFrame/api';
import type { Bookmark, DirData } from '@modules/DataFrame/types';
import type * as logApi from '@modules/LogFrame/api';
import type * as modalApi from '@modules/Modal/api';
import type { LISTENER_STATUS } from 'libs/ws';

export type Direction = -1 | 1;

export type WsCommand = {
  args: Record<string, unknown>;
  cwd: string;
  frame: Frame;
  id: string;
  name: string;
};

export type WsSuccessResponse = {
  cid: string;
  status: 'SUCCESS';
};

export type WsErrorResponse = {
  cid: string;
  data: { code: string; msg: string };
  status: 'ERROR';
};

export type WsDataResponse = {
  cid: string;
  data: string;
  status: 'SUCCESS';
};

export type WsProgressTaskResponse = {
  cid: string;
  data: { pid: string };
  status: 'PROGRESS_TASK';
};

export type WsCommandErrorResponse = {
  cid: '';
  data: { code: string; msg: string };
  status: 'COMMAND_ERROR';
};

export type WsCdResponse = {
  cid: string;
  data: DirData;
  status: 'SUCCESS';
};

export type WsBookmarkResponse = {
  cid: string;
  data: Bookmark[];
  status: 'SUCCESS';
};

export type WsVcpSkippedResponse = {
  cid: string;
  data: string[];
  status: 'SKIPPED';
};

export type WsCommandResponse =
  | WsBookmarkResponse
  | WsCdResponse
  | WsCommandErrorResponse
  | WsDataResponse
  | WsErrorResponse
  | WsProgressTaskResponse
  | WsSuccessResponse
  | WsVcpSkippedResponse;

export type WsProgressResponse = {
  cid: string;
  data: { pid: string; progress: number };
  status: (typeof LISTENER_STATUS)['progress'];
};

export type WsProgressErrorResponse = {
  cid: string;
  data: { msg: string; pid: string };
  status: (typeof LISTENER_STATUS)['progressError'];
};

export type WsProgressEndResponse = {
  cid: string;
  data: { pid: string };
  status: (typeof LISTENER_STATUS)['progressEnd'];
};

export type WsProgressAbortResponse = {
  cid: string;
  data: { pid: string };
  status: (typeof LISTENER_STATUS)['progressAbort'];
};

export type WsDirUpdateResponse = {
  cid: '';
  data: DirData;
  status: (typeof LISTENER_STATUS)['dirUpdate'];
};

export type WsWatchErrorResponse = {
  cid: '';
  data: { code: string; msg: string; path: string };
  status: (typeof LISTENER_STATUS)['watchError'];
};

export type WsListenerResponse =
  | WsDirUpdateResponse
  | WsProgressAbortResponse
  | WsProgressEndResponse
  | WsProgressErrorResponse
  | WsProgressResponse
  | WsWatchErrorResponse;

export type WsResponse = WsCommandResponse | WsListenerResponse;

export type Frame = 'a' | 'b';

export type Scope =
  | ''
  | 'ConfirmModal'
  | 'DataFrame'
  | 'EntryFilter'
  | 'ListModal'
  | 'ListModalEntryFilter'
  | 'LogFrame'
  | 'PromptModal';

export type Mode = 'filter' | 'gallery' | 'history' | 'preview' | 'virtual-dir';

export type Tag =
  | 'ConfirmModal:cancel'
  | 'ConfirmModal:confirm'
  | 'ListModal:bookmark'
  | 'ListModal:history'
  | 'PromptModal:cancel'
  | 'PromptModal:confirm'
  | 'PromptModal:input';

export type Api = typeof appApi &
  typeof dataFrameApi &
  typeof logApi &
  typeof modalApi;

export type CommandAction = (
  api: Api,
  combo: string,
  args?: any, // eslint-disable-line @typescript-eslint/no-explicit-any
) => Promise<void> | void;

export type CommandsConfig = { action: CommandAction; name: string }[];

export type MessagesConfig = string[];

export type SettingsConfig = {
  logScrollAmount: number;
  maxHistoryCount: number;
  maxLogCount: number;
  previewScrollAmount: number;
  progressTaskLogInterval: number;
  virtualDirExcludePattern: string;
};

export type ShortcutCommand = {
  args?: Record<string, unknown>;
  cmd: string;
  modes?: (Mode | `!${Mode}`)[];
  tags?: (Tag | `!${Tag}`)[];
};

export type ShortcutsConfig = Partial<
  Record<Scope, Record<string, ShortcutCommand[]>>
>;

type Association =
  | ((mime: null | string, path: string) => string | undefined)
  | { app: string; kind: 'mime' | 'path'; pattern: RegExp };

export type AssociationsConfig = Association[];

export type Config = {
  associations: AssociationsConfig;
  commands: CommandsConfig;
  messages: MessagesConfig;
  settings: SettingsConfig;
  shortcuts: ShortcutsConfig;
};
