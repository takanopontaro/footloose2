import { $activeFrame, $scope } from '@modules/App/state';
import { $filterQuery } from '@modules/DataFrame/state';
import { useAtom } from 'jotai';
import { memo, useCallback, useEffect, useRef } from 'react';
import type { Frame } from '@modules/App/types';
import type { FC, FocusEvent, FormEvent } from 'react';

type Props = {
  frame: Frame;
};

const EntryFilterComponent: FC<Props> = ({ frame }) => {
  const [activeFrame, setActiveFrame] = useAtom($activeFrame);
  const [scope, setScope] = useAtom($scope);
  const [filter, setFilter] = useAtom($filterQuery(frame));
  const elRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (activeFrame === frame && scope === 'EntryFilter') {
      elRef.current?.focus();
    }
  }, [activeFrame, frame, scope]);

  return (
    <div className="entryFilter">
      <input
        ref={elRef}
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
