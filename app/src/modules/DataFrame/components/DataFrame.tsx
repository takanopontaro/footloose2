import { $activeFrame, $api, $modes, $scope, $ws } from '@modules/App/state';
import {
  DirInfo,
  EntryFilter,
  Preview,
  Row,
} from '@modules/DataFrame/components';
import {
  $activeEntryIndex,
  $activeEntryName,
  $currentDir,
  $filteredEntries,
  $gridColumnCount,
  $isGalleryMode,
  $maxRenderedRowCount,
  $rawEntries,
  $renderedEntryEndIndex,
  $renderedEntryStartIndex,
  $renderedRowHeight,
  $selectedEntryNames,
  $sort,
} from '@modules/DataFrame/state';
import { useAtom, useAtomValue } from 'jotai';
import { useAtomCallback } from 'jotai/utils';
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type {
  Frame,
  WsDirUpdateResponse,
  WsWatchErrorResponse,
} from '@modules/App/types';
import type { FC, FocusEvent } from 'react';

type Props = {
  dirPath: string;
  frame: Frame;
  setFocus?: boolean;
};

const DataFrameComponent: FC<Props> = ({
  dirPath,
  frame,
  setFocus = false,
}) => {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isVisibleFirstRow, setIsVisibleFirstRow] = useState(false);
  const [isVisibleLastRow, setIsVisibleLastRow] = useState(false);
  const [activeFrame, setActiveFrame] = useAtom($activeFrame);
  const [scope, setScope] = useAtom($scope);
  const [dirName, setDirName] = useAtom($currentDir(frame));
  const [maxRowCount, setMaxRowCount] = useAtom($maxRenderedRowCount(frame));
  const [startRow, setStartRow] = useAtom($renderedEntryStartIndex(frame));
  const ws = useAtomValue($ws);
  const api = useAtomValue($api);
  const entries = useAtomValue($filteredEntries(frame));
  const curIndex = useAtomValue($activeEntryIndex(frame));
  const selectedNames = useAtomValue($selectedEntryNames(frame));
  const endRow = useAtomValue($renderedEntryEndIndex(frame));
  const gridColumnCount = useAtomValue($gridColumnCount(frame));
  const rowHeight = useAtomValue($renderedRowHeight);
  const sort = useAtomValue($sort(frame));
  const modes = useAtomValue($modes(frame));
  const isGalleryMode = useAtomValue($isGalleryMode(frame));
  const frameRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const curIndexRef = useRef(curIndex);

  curIndexRef.current = curIndex;

  const handleFocus = useCallback(
    (e: FocusEvent) => {
      e.stopPropagation();
      setActiveFrame(frame);
      setScope('DataFrame');
    },
    [frame, setActiveFrame, setScope],
  );

  const handleDirUpdate = useAtomCallback<void, [WsDirUpdateResponse]>(
    useCallback(
      (get, set, resp) => {
        const dirName = get($currentDir(frame));
        const { entries: newRawEntries, path } = resp.data;
        if (path !== dirName) {
          return;
        }
        const oldRawEntries = get($rawEntries(frame));
        set($filteredEntries(frame), newRawEntries);
        const newEntries = get($filteredEntries(frame));
        const curName = get($activeEntryName(frame));
        const deleted =
          oldRawEntries.some((e) => e.name === curName) &&
          !newRawEntries.some((e) => e.name === curName);
        if (!deleted) {
          return;
        }
        let done = false;
        let index = oldRawEntries.findIndex((e) => e.name === curName);
        while (index > 0) {
          const prevEntry = oldRawEntries[--index];
          const ent = newRawEntries.find((e) => e.name === prevEntry.name);
          if (!ent) {
            continue;
          }
          const found = newEntries.some((e) => e.name === prevEntry.name);
          if (found) {
            done = true;
            set($activeEntryName(frame), ent.name);
            break;
          }
        }
        if (!done) {
          set($activeEntryName(frame), '..');
        }
      },
      [frame],
    ),
  );

  const handleWatchError = useAtomCallback<void, [WsWatchErrorResponse]>(
    useCallback(
      (get, _set, resp) => {
        const dirName = get($currentDir(frame));
        const { msg, path } = resp.data;
        if (path === dirName) {
          api.writeLog(msg, 'error');
          api.changeDir('~', frame);
        }
      },
      [api, frame],
    ),
  );

  useLayoutEffect(() => {
    const containerW = gridRef.current!.offsetWidth;
    const containerH = gridRef.current!.offsetHeight;
    const rowH = isGalleryMode ? containerW / gridColumnCount : rowHeight;
    // overflow ありの行数
    const maxRowCount = Math.ceil(containerH / rowH);
    setMaxRowCount(maxRowCount);
    // overflow なしの行数
    const rowCount = Math.floor(containerH / rowH);
    setIsOverflowing(entries.length > gridColumnCount * rowCount);
  }, [entries, gridColumnCount, isGalleryMode, rowHeight, setMaxRowCount]);

  useLayoutEffect(() => {
    const index = curIndexRef.current;
    if (index === -1) {
      setStartRow(0);
      return;
    }
    // スクロール無しで全 entry を表示できる場合
    if (index < maxRowCount * gridColumnCount) {
      setStartRow(0);
      return;
    }
    const newIndex = index - (index % gridColumnCount);
    setStartRow(newIndex);
  }, [gridColumnCount, maxRowCount, setStartRow]);

  useLayoutEffect(() => {
    const isVisibleFirst = curIndex < startRow + gridColumnCount;
    if (isVisibleFirst) {
      setIsVisibleFirstRow(true);
      setIsVisibleLastRow(false);
    }
    const isVisibleLast =
      curIndex >= startRow + gridColumnCount * maxRowCount - gridColumnCount;
    if (isVisibleLast) {
      setIsVisibleFirstRow(false);
      setIsVisibleLastRow(true);
    }
  }, [curIndex, gridColumnCount, maxRowCount, startRow]);

  useEffect(() => {
    ws.registerListener('DIR_UPDATE', handleDirUpdate);
    setDirName(dirPath);
    api.changeDir(dirPath, frame);
    return () => {
      ws.removeListener('DIR_UPDATE', handleDirUpdate);
    };
  }, [api, dirPath, frame, handleDirUpdate, setDirName, ws]);

  useEffect(() => {
    ws.registerListener('WATCH_ERROR', handleWatchError);
    return () => {
      ws.removeListener('WATCH_ERROR', handleWatchError);
    };
  }, [handleWatchError, ws]);

  useEffect(() => {
    if (activeFrame === frame && scope === 'DataFrame') {
      frameRef.current?.focus();
    }
  }, [activeFrame, frame, scope]);

  useEffect(() => {
    if (setFocus) {
      frameRef.current?.focus();
    }
  }, [setFocus]);

  return (
    <div
      ref={frameRef}
      className={`dataFrame ${activeFrame === frame ? 'dataFrame-active' : ''}`}
      data-frame={frame}
      data-mode={modes.join(' ')}
      data-sort={`${sort.field}:${sort.order}`}
      tabIndex={-1}
      onFocus={handleFocus}
    >
      <div className="dirName">{dirName}</div>
      <div
        ref={gridRef}
        className={`entryGrid ${isOverflowing ? 'entryGrid-overflowing' : ''} ${isVisibleFirstRow ? 'entryGrid-visibleFirst' : ''} ${isVisibleLastRow ? 'entryGrid-visibleLast' : ''}`}
      >
        <table className="entryGrid_table">
          <tbody className="entryGrid_tbody">
            {entries.slice(startRow, endRow + 1).map((entry, i) => (
              <Row
                key={`${dirName}/${entry.name}`}
                current={curIndex === startRow + i}
                entry={entry}
                frame={frame}
                selected={selectedNames.includes(entry.name)}
              />
            ))}
          </tbody>
        </table>
      </div>
      <EntryFilter frame={frame} />
      <DirInfo frame={frame} />
      {modes.includes('preview') && <Preview frame={frame} />}
    </div>
  );
};

export const DataFrame = memo(DataFrameComponent);
