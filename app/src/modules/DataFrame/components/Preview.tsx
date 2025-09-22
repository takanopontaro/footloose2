import { useAtomValue, useSetAtom } from 'jotai';
import { memo, useEffect } from 'react';
import { usePreview } from '@modules/DataFrame/hooks';
import {
  $activeEntryIndex,
  $filteredEntries,
  $previewRef,
} from '@modules/DataFrame/state';

import type { FC } from 'react';
import type { Frame } from '@modules/App/types';

type Props = {
  frame: Frame;
};

const PreviewComponent: FC<Props> = ({ frame }) => {
  const setPreviewRef = useSetAtom($previewRef(frame));
  const activeEntryIndex = useAtomValue($activeEntryIndex(frame));
  const entries = useAtomValue($filteredEntries(frame));

  // 初回読込時などで activeEntryIndex === -1 が起こり得る。
  const entry = entries[activeEntryIndex] ?? null;

  const { node, ref } = usePreview(entry, frame, 'preview_media');

  useEffect(() => {
    if (ref?.current) {
      setPreviewRef(ref.current);
    }
    // ref を deps に入れても useEffect は再実行されない。
    // ref.current が変わったら setPreviewRef を再実行したいため、
    // node を deps に入れて、トリガーとする。
  }, [node, ref, setPreviewRef]);

  if (entry === null) {
    return null;
  }

  const { name, perm, size, time } = entry;

  return (
    <div className="preview" data-perm={perm}>
      <div className="preview_area">{node}</div>
      <ul className="preview_info">
        <li className="preview_perm">{perm}</li>
        <li className="preview_name">{name}</li>
        <li className="preview_size">{size}</li>
        <li className="preview_time">{time}</li>
      </ul>
    </div>
  );
};

export const Preview = memo(PreviewComponent);
