import { useAtomValue } from 'jotai';
import { memo } from 'react';
import { createPortal } from 'react-dom';
import { useInitialDir, useWebSocket } from '@modules/App/hooks';
import { $modal } from '@modules/App/state';
import { DataFrame } from '@modules/DataFrame/components';
import { LogFrame } from '@modules/LogFrame/components';

import type { FC } from 'react';

/**
 * App コンポーネントの props。
 */
type Props = {
  /**
   * WebSocket サーバーのポート番号。
   */
  port: number;
};

/**
 * アプリケーションのメインコンポーネント。
 * 各種フレームとモーダルを表示する。
 */
const AppComponent: FC<Props> = ({ port }) => {
  const wsAtom = useWebSocket(port);
  const loadable = useAtomValue(wsAtom);
  const Modal = useAtomValue($modal);
  const [dirPathA, dirPathB] = useInitialDir();

  switch (loadable.state) {
    case 'hasError':
      throw new Error('WebSocket connection failed');
    case 'loading':
      return null;
  }

  return (
    <div className="app">
      <DataFrame frame="a" initialDir={dirPathA} initialFocus={true} />
      <DataFrame frame="b" initialDir={dirPathB} />
      <LogFrame />
      {Modal && createPortal(Modal, document.body)}
    </div>
  );
};

export const App = memo(AppComponent);
