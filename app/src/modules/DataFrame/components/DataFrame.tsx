import clsx from 'clsx';
import { useAtomValue, useSetAtom } from 'jotai';
import { memo, useCallback, useRef } from 'react';
import { $activeFrame, $modes, $scope } from '@modules/App/state';
import {
  DirInfo,
  EntryFilter,
  Preview,
  Row,
} from '@modules/DataFrame/components';
import {
  useCurrentDir,
  useDirUpdate,
  useFocusFrame,
  useGridState,
  useGridViewport,
  useWatchError,
} from '@modules/DataFrame/hooks';
import {
  $activeEntryIndex,
  $filteredEntries,
  $lastVisibleEntryIndex,
  $firstVisibleEntryIndex,
  $selectedEntryNames,
  $sort,
} from '@modules/DataFrame/state';

import type { FC, FocusEvent } from 'react';
import type { Frame } from '@modules/App/types';

type Props = {
  frame: Frame;
  initialDir: string;
  initialFocus?: boolean;
};

const DataFrameComponent: FC<Props> = ({
  frame,
  initialDir,
  initialFocus = false,
}) => {
  const setActiveFrame = useSetAtom($activeFrame);
  const setScope = useSetAtom($scope);
  const entries = useAtomValue($filteredEntries(frame));
  const curIndex = useAtomValue($activeEntryIndex(frame));
  const selectedNames = useAtomValue($selectedEntryNames(frame));
  const firstEntryIndex = useAtomValue($firstVisibleEntryIndex(frame));
  const lastEntryIndex = useAtomValue($lastVisibleEntryIndex(frame));
  const sort = useAtomValue($sort(frame));
  const modes = useAtomValue($modes(frame));
  const gridRef = useRef<HTMLDivElement>(null);
  const curDir = useCurrentDir(frame, initialDir);
  const { frameRef, isFrameFocused } = useFocusFrame(frame, initialFocus);
  const gridState = useGridState(frame, gridRef);

  useGridViewport(frame, gridRef);
  useDirUpdate(frame);
  useWatchError(frame);

  const handleFocus = useCallback(
    (e: FocusEvent) => {
      e.stopPropagation();
      setActiveFrame(frame);
      setScope('DataFrame');
    },
    [frame, setActiveFrame, setScope],
  );

  return (
    <div
      ref={frameRef}
      className={clsx('dataFrame', { 'dataFrame-active': isFrameFocused })}
      data-frame={frame}
      data-mode={modes.join(' ')}
      data-sort={`${sort.field}:${sort.order}`}
      tabIndex={-1}
      onFocus={handleFocus}
    >
      <div className="curDir">{curDir}</div>
      <div
        ref={gridRef}
        className={clsx('entryGrid', {
          'entryGrid-overflowing': gridState.isOverflowing,
          'entryGrid-visibleFirst': gridState.isFirstRowVisible,
          'entryGrid-visibleLast': gridState.isLastRowVisible,
        })}
      >
        <table className="entryGrid_table">
          <tbody className="entryGrid_tbody">
            {entries
              .slice(firstEntryIndex, lastEntryIndex + 1)
              .map((entry, i) => (
                <Row
                  key={`${curDir}/${entry.name}`}
                  current={curIndex === firstEntryIndex + i}
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
