import { usePreview } from '@modules/DataFrame/hooks';
import {
  $activeEntryIndex,
  $filteredEntries,
  $previewRef,
} from '@modules/DataFrame/state';
import { useAtomValue, useSetAtom } from 'jotai';
import { memo, useEffect } from 'react';
import type { Frame } from '@modules/App/types';
import type { FC } from 'react';

type Props = {
  frame: Frame;
};

const PreviewComponent: FC<Props> = ({ frame }) => {
  const setPreviewRef = useSetAtom($previewRef(frame));
  const curIndex = useAtomValue($activeEntryIndex(frame));
  const entries = useAtomValue($filteredEntries(frame));
  const entry = entries[curIndex] ?? null;
  const { node, ref } = usePreview(entry, frame, 'preview_media');
  useEffect(() => {
    if (ref === null || ref.current === null) {
      return;
    }
    setPreviewRef(ref.current);
  }, [node, ref, setPreviewRef]); // ref 自体は不変のため node を deps に入れる
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
