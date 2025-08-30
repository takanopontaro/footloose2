import { $modes } from '@modules/App/state';
import {
  $filteredEntries,
  $rawEntries,
  $selectedEntryNames,
  $sort,
} from '@modules/DataFrame/state';
import { useAtomValue } from 'jotai';
import { memo, useEffect, useState } from 'react';
import type { Frame } from '@modules/App/types';
import type { FC } from 'react';

type Props = {
  frame: Frame;
};

const DirInfoComponent: FC<Props> = ({ frame }) => {
  const [dirs, setDirs] = useState(0);
  const [files, setFiles] = useState(0);
  const [links, setLinks] = useState(0);
  const rawEntries = useAtomValue($rawEntries(frame));
  const entries = useAtomValue($filteredEntries(frame));
  const selectedNames = useAtomValue($selectedEntryNames(frame));
  const sort = useAtomValue($sort(frame));
  const modes = useAtomValue($modes(frame));

  const filteredCount = rawEntries.length - entries.length;

  useEffect(() => {
    const res = entries.reduce(
      (o, e) => {
        if (e.name === '..') {
          return o;
        } else if (e.perm.startsWith('d')) {
          o.dirs++;
        } else if (e.perm.startsWith('-')) {
          o.files++;
        } else if (e.perm.startsWith('l')) {
          o.links++;
        }
        return o;
      },
      { dirs: 0, files: 0, links: 0 },
    );
    setDirs(res.dirs);
    setFiles(res.files);
    setLinks(res.links);
  }, [entries]);

  return (
    <div className="dirInfo">
      <div className="dirInfo_dirs">{dirs}</div>
      <div className="dirInfo_files">{files}</div>
      <div className="dirInfo_links">{links}</div>
      <div className="dirInfo_selected">
        {selectedNames.length}/{entries.length - 1}
      </div>
      <div className="dirInfo_filtered">
        {filteredCount > 0 && filteredCount}
      </div>
      <div className="dirInfo_modes">
        {modes.map((m) => (
          <span key={m} className="dirInfo_mode">
            {m}
          </span>
        ))}
      </div>
      <div className="dirInfo_sort">{`${sort.field}:${sort.order}`}</div>
    </div>
  );
};

export const DirInfo = memo(DirInfoComponent);
