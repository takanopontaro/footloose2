import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@modules/App/components/App';

import type { Config } from '@modules/App/types';

function init(config: Config): void {
  const root = document.getElementById('root')!;
  createRoot(root).render(
    <StrictMode>
      <App config={config} />
    </StrictMode>,
  );
}

export { init };
