import { RESET } from 'jotai/utils';
import { readState, writeState } from '@libs/utils';
import { $activeFrame, $config, $inactiveFrame } from '@modules/App/state';
import {
  changeDir,
  getTargetName,
  getTargetNames,
} from '@modules/DataFrame/api';
import {
  getPrevName,
  isCommandErrorResp,
  isErrorResp,
  wsSend,
} from '@modules/DataFrame/libs';
import {
  $activeEntryName,
  $currentDir,
  $rawEntries,
  $selectedEntryNames,
  $virtualDirInfo,
} from '@modules/DataFrame/state';
import { writeLog } from '@modules/LogFrame/api';

import type {
  WsCdResponse,
  WsResponse,
  WsVcpSkippedResponse,
} from '@modules/App/types';
import type { VirtualDirKind } from '@modules/DataFrame/types';

function isOutsideRoot(resp: WsResponse): boolean {
  return isErrorResp(resp) && resp.data.code === 'E006002';
}

function isCopySkipped(resp: WsResponse): resp is WsVcpSkippedResponse {
  return resp.status === 'SKIPPED';
}

function getVirtualDirKindFromExt(archive: string): VirtualDirKind | undefined {
  const matches = archive.match(/\.(zip|tar|tgz|tar\.gz)$/);
  if (matches === null) {
    return;
  }
  const kind = matches[1] === 'tar.gz' ? 'tgz' : matches[1];
  return kind as VirtualDirKind;
}

function changeVirtualDir(
  path?: string,
  kind?: VirtualDirKind,
  frame = readState($activeFrame),
): void {
  const { messages, settings } = readState($config);
  path = path ?? getTargetName(frame, true);
  if (path === '') {
    writeLog(`${frame}: ${messages[0]}`, 'info');
    return;
  }
  let vd = readState($virtualDirInfo(frame));
  if (vd === null) {
    const dirName = readState($currentDir(frame));
    const archive = path.startsWith('/') ? path : `${dirName}/${path}`;
    kind = kind ?? getVirtualDirKindFromExt(archive);
    if (!kind) {
      writeLog(`${frame}: ${messages[12]}`, 'info');
      return;
    }
    vd = { archive, kind };
    writeState($virtualDirInfo(frame), vd);
  }
  wsSend<WsCdResponse>(
    'cvd',
    {
      kind: vd.kind,
      archive: vd.archive,
      path,
      filter: settings.virtualDirExcludePattern,
    },
    (resp) => {
      if (isOutsideRoot(resp)) {
        changeDir(path, frame);
        return;
      }
      if (isErrorResp(resp) || isCommandErrorResp(resp)) {
        writeLog(resp.data.msg, 'error');
        changeDir('~', frame);
        return;
      }
      const { entries, path: p } = resp.data;
      const prevName = getPrevName(p, frame);
      writeState($currentDir(frame), p);
      writeState($rawEntries(frame), entries);
      writeState($activeEntryName(frame), prevName === null ? RESET : prevName);
      writeState($selectedEntryNames(frame), RESET);
    },
    frame,
  );
}

function goToParentVirtualDir(frame = readState($activeFrame)): void {
  const vd = readState($virtualDirInfo(frame));
  if (vd === null) {
    return;
  }
  const dirName = readState($currentDir(frame));
  changeVirtualDir(`${dirName}/..`, vd.kind, frame);
}

function extractSelectedEntries(
  paths?: string[],
  kind?: VirtualDirKind,
  frame = readState($activeFrame),
): void {
  paths = paths ?? getTargetNames(frame);
  if (paths.length === 0) {
    const { messages } = readState($config);
    writeLog(`${frame}: ${messages[0]}`, 'info');
    return;
  }
  const vd = readState($virtualDirInfo(frame));
  if (vd === null) {
    return;
  }
  const destination = readState($currentDir(readState($inactiveFrame)));
  wsSend<WsCdResponse | WsVcpSkippedResponse>(
    'vcp',
    { kind: vd.kind, archive: vd.archive, sources: paths, destination },
    (resp) => {
      if (isCopySkipped(resp)) {
        const { messages } = readState($config);
        writeLog(`${frame}: ${messages[13]}: ${resp.data.join(', ')}`, 'warn');
        return;
      }
      if (isErrorResp(resp) || isCommandErrorResp(resp)) {
        writeLog(resp.data.msg, 'error');
        return;
      }
    },
    frame,
  );
}

export {
  getVirtualDirKindFromExt,
  changeVirtualDir,
  goToParentVirtualDir,
  extractSelectedEntries,
};
