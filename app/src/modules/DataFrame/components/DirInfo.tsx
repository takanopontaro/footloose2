import { useAtomValue } from 'jotai';
import { memo, useEffect, useState } from 'react';
import { $matchMode, $modes } from '@modules/App/state';
import { getSortDisplay } from '@modules/DataFrame/libs';
import {
  $filteredEntries,
  $rawEntries,
  $selectedEntryNames,
  $sort,
} from '@modules/DataFrame/state';

import type { FC } from 'react';
import type { Frame } from '@modules/App/types';
import type { Entry } from '@modules/DataFrame/types';

/**
 * ディレクトリにあるエントリ郡の統計情報。
 */
type DirStats = {
  /**
   * ディレクトリの数。
   */
  dirs: number;
  /**
   * ファイルの数。
   */
  files: number;
  /**
   * シンボリックリンクの数。
   */
  links: number;
};

/**
 * エントリ一覧の統計情報を取得する。
 *
 * @param entries - エントリ一覧
 * @returns 統計情報
 */
function getDirStats(entries: Entry[]): DirStats {
  const stats: DirStats = { dirs: 0, files: 0, links: 0 };
  for (const { name, perm } of entries) {
    if (name === '..') {
      continue;
    }
    switch (true) {
      case perm.startsWith('d'):
        stats.dirs++;
        break;
      case perm.startsWith('-'):
        stats.files++;
        break;
      case perm.startsWith('l'):
        stats.links++;
        break;
    }
  }
  return stats;
}

/**
 * DirInfo コンポーネントの props。
 */
type Props = {
  /**
   * 対象フレーム。
   */
  frame: Frame;
};

/**
 * ディレクトリの詳細情報を表示するコンポーネント。
 */
const DirInfoComponent: FC<Props> = ({ frame }) => {
  const [dirs, setDirs] = useState(0);
  const [files, setFiles] = useState(0);
  const [links, setLinks] = useState(0);
  const rawEntries = useAtomValue($rawEntries(frame));
  const entries = useAtomValue($filteredEntries(frame));
  const selectedNames = useAtomValue($selectedEntryNames(frame));
  const sort = useAtomValue($sort(frame));
  const modes = useAtomValue($modes(frame));
  const matchMode = useAtomValue($matchMode(frame));

  const filteredCount = rawEntries.length - entries.length;

  useEffect(() => {
    const { dirs, files, links } = getDirStats(rawEntries);
    setDirs(dirs);
    setFiles(files);
    setLinks(links);
  }, [rawEntries]);

  return (
    <div className="dirInfo">
      <div className="dirInfo_dirs">{dirs}</div>
      <div className="dirInfo_files">{files}</div>
      <div className="dirInfo_links">{links}</div>
      <div className="dirInfo_selected">
        {selectedNames.length}/{rawEntries.length - 1}
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
      <div className="dirInfo_sort">{getSortDisplay(sort)}</div>
      <div className="dirInfo_matchMode">{matchMode}</div>
    </div>
  );
};

export const DirInfo = memo(DirInfoComponent);
