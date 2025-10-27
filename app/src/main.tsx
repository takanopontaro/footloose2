import { Provider } from 'jotai';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { store } from '@libs/store';
import { App } from '@modules/App/components/App';
import { $config } from '@modules/App/state';

import type { Config } from '@modules/App/types';

/**
 * ルートコンポーネント。
 * Config を受け取り、jotai の store に格納する。
 */
function init(config: Config): void {
  store.set($config, config);

  const root = document.getElementById('root')!;

  createRoot(root).render(
    <StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </StrictMode>,
  );
}

export { init };
