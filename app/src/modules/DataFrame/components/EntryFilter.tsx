import { useAtom } from 'jotai';
import { memo, useCallback, useEffect, useRef } from 'react';
import { $activeFrame, $scope } from '@modules/App/state';
import { $filterQuery } from '@modules/DataFrame/state';

import type { FC, FocusEvent, FormEvent } from 'react';
import type { Frame } from '@modules/App/types';

/**
 * EntryFilter コンポーネントの props。
 */
type Props = {
  /**
   * 対象フレーム。
   */
  frame: Frame;
};

/**
 * エントリ一覧の絞り込み入力欄コンポーネント。
 */
const EntryFilterComponent: FC<Props> = ({ frame }) => {
  const [activeFrame, setActiveFrame] = useAtom($activeFrame);
  const [scope, setScope] = useAtom($scope);
  const [filter, setFilter] = useAtom($filterQuery(frame));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeFrame === frame && scope === 'EntryFilter') {
      inputRef.current?.focus();
    }
  }, [activeFrame, frame, scope]);

  const handleFocus = useCallback(
    (e: FocusEvent) => {
      e.stopPropagation();
      setActiveFrame(frame);
      setScope('EntryFilter');
    },
    [frame, setActiveFrame, setScope],
  );

  const handleInput = useCallback(
    (e: FormEvent<HTMLInputElement>) => setFilter(e.currentTarget.value),
    [setFilter],
  );

  return (
    <div className="entryFilter">
      <input
        ref={inputRef}
        className="mousetrap entryFilter_input"
        tabIndex={-1}
        type="text"
        value={filter}
        onFocus={handleFocus}
        onInput={handleInput}
      />
    </div>
  );
};

export const EntryFilter = memo(EntryFilterComponent);
