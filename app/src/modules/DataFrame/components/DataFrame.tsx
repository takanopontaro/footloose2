import clsx from 'clsx';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { memo, useCallback, useRef } from 'react';
import { $activeFrame, $scope } from '@modules/App/state';
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
import { getSortDisplay } from '@modules/DataFrame/libs';
import {
  $activeEntryName,
  $modes,
  $renderedEntries,
  $selectedEntryNames,
  $sort,
} from '@modules/DataFrame/state';

import type { FC, FocusEvent } from 'react';
import type { Frame } from '@modules/App/types';

/**
 * DataFrame コンポーネントの props。
 */
type Props = {
  /**
   * 対象フレーム。
   */
  frame: Frame;
  /**
   * 初期ディレクトリ。
   */
  initialDir: string;
  /**
   * 初期フォーカスを当てるか否か。
   */
  initialFocus?: boolean;
};

/**
 * エントリ一覧を表示するコンポーネント。
 * リスト表示とグリッド表示が可能。
 */
const DataFrameComponent: FC<Props> = ({
  frame,
  initialDir,
  initialFocus = false,
}) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [activeFrame, setActiveFrame] = useAtom($activeFrame);
  const setScope = useSetAtom($scope);
  const entries = useAtomValue($renderedEntries(frame));
  const activeEntryName = useAtomValue($activeEntryName(frame));
  const selectedNames = useAtomValue($selectedEntryNames(frame));
  const sort = useAtomValue($sort(frame));
  const modes = useAtomValue($modes(frame));
  const curDir = useCurrentDir(frame, initialDir);
  const gridState = useGridState(frame, gridRef);

  useGridViewport(frame, gridRef);
  useDirUpdate(frame);
  useWatchError(frame);
  useFocusFrame(frame, frameRef, initialFocus);

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
      className={clsx('dataFrame', {
        'dataFrame-active': activeFrame === frame,
      })}
      data-frame={frame}
      data-mode={modes.join(' ')}
      data-sort={getSortDisplay(sort)}
      tabIndex={-1}
      onFocus={handleFocus}
    >
      <div className="curDir">{curDir}</div>
      <div
        ref={gridRef}
        className={clsx('entryGrid', {
          'entryGrid-overflowing': gridState.isOverflowing,
          'entryGrid-anchorTop': gridState.overflowAnchor === 'top',
          'entryGrid-anchorBottom': gridState.overflowAnchor === 'bottom',
        })}
      >
        <table className="entryGrid_table">
          <tbody className="entryGrid_tbody">
            {entries.map((entry) => (
              <Row
                key={`${curDir}/${entry.name}`}
                current={activeEntryName === entry.name}
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
