import { memo } from 'react';
import { useThumbnail } from '@modules/DataFrame/hooks';

import type { FC } from 'react';
import type { Frame } from '@modules/App/types';
import type { Entry } from '@modules/DataFrame/types';

/**
 * Row コンポーネントの props。
 */
type Props = {
  /**
   * カレントエントリか否か。
   */
  current: boolean;
  /**
   * 対象エントリ。
   */
  entry: Entry;
  /**
   * 対象フレーム。
   */
  frame: Frame;
  /**
   * 選択されているか否か。
   */
  selected: boolean;
};

/**
 * エントリ一覧の行コンポーネント。
 */
const RowComponent: FC<Props> = ({ current, entry, frame, selected }) => {
  const thumbnail = useThumbnail(entry, frame, 'entryGrid_thumbnail');
  const { link, name, perm, size, time } = entry;

  return (
    <tr
      aria-current={current ? 'true' : undefined}
      aria-selected={selected}
      className="entryGrid_tr"
      data-perm={perm}
      data-symlink={link ? link : undefined}
    >
      <td className="entryGrid_td" data-column="thumbnail">
        <div className="entryGrid_tdInner">
          <span className="entryGrid_data">{thumbnail}</span>
        </div>
      </td>
      <td className="entryGrid_td" data-column="perm">
        <div className="entryGrid_tdInner">
          <span className="entryGrid_data">{perm}</span>
        </div>
      </td>
      <td className="entryGrid_td" data-column="name">
        <div className="entryGrid_tdInner">
          <span className="entryGrid_data">{name}</span>
        </div>
      </td>
      <td className="entryGrid_td" data-column="size">
        <div className="entryGrid_tdInner">
          <span className="entryGrid_data">{size}</span>
        </div>
      </td>
      <td className="entryGrid_td" data-column="time">
        <div className="entryGrid_tdInner">
          <span className="entryGrid_data">{time}</span>
        </div>
      </td>
    </tr>
  );
};

export const Row = memo(RowComponent);
