import { useAtomValue, useSetAtom } from 'jotai';
import { memo } from 'react';
import { createPortal } from 'react-dom';
import { useInitialDir, useWebSocket } from '@modules/App/hooks';
import { $config, $modal } from '@modules/App/state';
import { DataFrame } from '@modules/DataFrame/components';
import { LogFrame } from '@modules/LogFrame/components';

import type { FC } from 'react';
import type { Config } from '@modules/App/types';

type Props = {
  config: Config;
};

const AppComponent: FC<Props> = ({ config }) => {
  const wsAtom = useWebSocket(3000);
  const [dirPathA, dirPathB] = useInitialDir();
  const setConfig = useSetAtom($config);
  const loadable = useAtomValue(wsAtom);
  const Modal = useAtomValue($modal);
  setConfig(config);
  switch (loadable.state) {
    case 'hasError': {
      throw new Error('WebSocket connection failed');
    }
    case 'loading': {
      return null;
    }
  }
  return (
    <div className="app">
      <DataFrame dirPath={dirPathA} frame="a" setFocus={true} />
      <DataFrame dirPath={dirPathB} frame="b" />
      <LogFrame />
      {Modal && createPortal(Modal, document.body)}
    </div>
  );
};

export const App = memo(AppComponent);
