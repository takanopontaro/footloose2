import { RESET } from 'jotai/utils';
import { get, set } from '@libs/utils';
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
  $filteredEntries,
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
  frame = get($activeFrame),
): void {
  const { messages, settings } = get($config);
  path = path ?? getTargetName(frame, true);
  if (path === '') {
    writeLog(`${frame}: ${messages[0]}`, 'info');
    return;
  }
  let vd = get($virtualDirInfo(frame));
  if (vd === null) {
    const dirName = get($currentDir(frame));
    const archive = path.startsWith('/') ? path : `${dirName}/${path}`;
    kind = kind ?? getVirtualDirKindFromExt(archive);
    if (!kind) {
      writeLog(`${frame}: ${messages[12]}`, 'info');
      return;
    }
    vd = { archive, kind };
    set($virtualDirInfo(frame), vd);
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
      set($currentDir(frame), p);
      set($filteredEntries(frame), entries);
      set($activeEntryName(frame), prevName === null ? RESET : prevName);
      set($selectedEntryNames(frame), RESET);
    },
    frame,
  );
}

function goToParentVirtualDir(frame = get($activeFrame)): void {
  const vd = get($virtualDirInfo(frame));
  if (vd === null) {
    return;
  }
  const dirName = get($currentDir(frame));
  changeVirtualDir(`${dirName}/..`, vd.kind, frame);
}

function extractSelectedEntries(
  paths?: string[],
  kind?: VirtualDirKind,
  frame = get($activeFrame),
): void {
  paths = paths ?? getTargetNames(frame);
  if (paths.length === 0) {
    const { messages } = get($config);
    writeLog(`${frame}: ${messages[0]}`, 'info');
    return;
  }
  const vd = get($virtualDirInfo(frame));
  if (vd === null) {
    return;
  }
  const destination = get($currentDir(get($inactiveFrame)));
  wsSend<WsCdResponse | WsVcpSkippedResponse>(
    'vcp',
    { kind: vd.kind, archive: vd.archive, sources: paths, destination },
    (resp) => {
      if (isCopySkipped(resp)) {
        const { messages } = get($config);
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
