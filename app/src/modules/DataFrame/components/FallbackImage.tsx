import { memo, useState } from 'react';

import type { FC } from 'react';

/**
 * 1px の透過 PNG。
 */
const PNG1PX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQYV2NgAAIAAAUAAarVyFEAAAAASUVORK5CYII=';

/**
 * FallbackImage コンポーネントの props。
 */
type Props = {
  /**
   * 付与するクラス名。
   */
  className?: string;
  /**
   * 画像のソース。
   */
  src: string;
};

/**
 * ギャラリーモードで表示するサムネイル画像コンポーネント。
 * 読込失敗時はフォールバックとして 1px 透過 PNG を表示する。
 * (virtual-dir モード中に gallery モードにした時など)
 * フォールバック時に一瞬プレースホルダが見えるのを防ぐため、
 * visibility を制御する。
 */
const FallbackImageComponent: FC<Props> = ({ className, src }) => {
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState(false);

  return (
    <img
      alt=""
      className={className}
      src={error ? PNG1PX : src}
      style={{ visibility: visible ? 'visible' : 'hidden' }}
      onError={() => setError(true)}
      onLoad={() => setVisible(true)}
    />
  );
};

export const FallbackImage = memo(FallbackImageComponent);
