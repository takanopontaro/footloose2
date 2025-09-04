import type { AssociationsConfig } from '@modules/App/types';

const associations: AssociationsConfig = [
  // By MIME type
  // { kind: 'mime', pattern: /^text\//, app: 'Visual Studio Code' },
  //
  // By file path
  // { kind: 'path', pattern: /\.json$/, app: 'Visual Studio Code' },
  //
  // By function
  // (mime, path) => {
  //   if (mime === 'application/toml') {
  //     return 'Visual Studio Code';
  //   }
  // },
];

export { associations };
