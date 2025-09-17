import { useAtomValue } from 'jotai';
import { memo } from 'react';
import { createPortal } from 'react-dom';
import { useInitialDir, useWebSocket } from '@modules/App/hooks';
import { $modal } from '@modules/App/state';
import { DataFrame } from '@modules/DataFrame/components';
import { LogFrame } from '@modules/LogFrame/components';

import type { FC } from 'react';

const AppComponent: FC = () => {
  const wsAtom = useWebSocket(3000);
  const [dirPathA, dirPathB] = useInitialDir();

  const loadable = useAtomValue(wsAtom);
  const Modal = useAtomValue($modal);

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
