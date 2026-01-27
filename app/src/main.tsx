import { Provider } from 'jotai';
import * as jsmigemo from 'jsmigemo';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { store } from '@libs/store';
import { App } from '@modules/App/components/App';
import { $config } from '@modules/App/state';

import type { Config } from '@modules/App/types';

const migemo = await fetch('./migemo-compact-dict')
  .then((res) => res.arrayBuffer())
  .then((ab) => {
    const dict = new jsmigemo.CompactDictionary(ab);
    const migemo = new jsmigemo.Migemo();
    migemo.setDict(dict);
    return migemo;
  });

/**
 * ルートコンポーネント。
 * Config を受け取り、jotai の store に格納する。
 *
 * @param config - アプリケーションの設定
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
