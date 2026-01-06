import type { MessagesConfig } from '@modules/App/types';

/**
 * メッセージの一覧。
 * それほど多くないため、ライブラリは導入せず簡易的に済ませる。
 */
const messages: MessagesConfig = [
  'No target paths',
  'No bookmarks found',
  'Bookmark added',
  'Bookmark deleted',
  'No history found',
  'Invalid input text',
  'Are you sure?',
  'Broken symlink',
  'Copied selected paths to the clipboard',
  'Failed to copy selected paths to the clipboard',
  'Copied the current path to the clipboard',
  'Failed to copy the current path to the clipboard',
  'Could not determine archive type',
  'Already exists',
  'Not available in virtual directories',
];

export { messages };
