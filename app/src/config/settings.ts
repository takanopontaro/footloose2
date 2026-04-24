import type { SettingsConfig } from '@modules/App/types';

const settings: SettingsConfig = {
  clearEntryFilterOnDirChange: true,
  logScrollAmount: 40,
  maxHistoryCount: 100,
  maxLogCount: 1000,
  previewScrollAmount: 40,
  progressTaskLogInterval: 3000,
  // Mac のリソースフォークと AppleDouble 形式のメタデータを除外する。
  virtualDirExcludePatterns: ['^(?:__MACOSX/|\\._.+)'],
};

export { settings };
