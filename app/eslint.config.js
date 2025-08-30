import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import perfectionist from 'eslint-plugin-perfectionist';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import * as regexpPlugin from 'eslint-plugin-regexp';
import sortDestructureKeys from 'eslint-plugin-sort-destructure-keys';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/*
importPlugin.flatConfigs.recommended を使うと lint がすべて効かなくなった
flat config に完全には対応していなさそう？
大抵のことは ts がやってくれるので、recommended は不要と判断
import/order など必要なもののみ使うことにした
*/

// eslint-disable-next-line import/no-default-export
export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      regexpPlugin.configs['flat/recommended'],
      reactPlugin.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
      eslintConfigPrettier,
    ],
    files: ['**/*.{ts,tsx,js}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        allowDefaultProject: true,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'sort-destructure-keys': sortDestructureKeys,
      'import': importPlugin,
      'perfectionist': perfectionist,
    },
    rules: {
      'sort-imports': ['error', { ignoreDeclarationSort: true }],
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'react/jsx-sort-props': [
        'error',
        { callbacksLast: true, shorthandLast: true, reservedFirst: true },
      ],
      'react/react-in-jsx-scope': 'off',
      'import/no-duplicates': 'error',
      'import/order': [
        'error',
        {
          'newlines-between': 'never',
          'alphabetize': { order: 'asc', caseInsensitive: true },
          'groups': [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'type',
          ],
          'pathGroups': [
            {
              pattern: '../**/*',
              group: 'type',
              position: 'after',
            },
            {
              pattern: './**/*',
              group: 'type',
              position: 'after',
            },
            // {
            //   pattern: '@modules/**/*',
            //   group: 'internal',
            //   position: 'after',
            // },
            // {
            //   pattern: '@libs/**/*',
            //   group: 'internal',
            //   position: 'after',
            // },
          ],
          'pathGroupsExcludedImportTypes': [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
        },
      ],
      'import/no-default-export': 'error',
      'perfectionist/sort-intersection-types': ['error', { groups: ['named'] }],
      'perfectionist/sort-object-types': ['error', { groups: ['unknown'] }],
      'perfectionist/sort-union-types': ['error', { groups: ['named'] }],
      'sort-destructure-keys/sort-destructure-keys': 'error',
      'jsx-a11y/media-has-caption': 'off',
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' },
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true },
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'typeAlias', format: ['PascalCase'] },
        { selector: 'interface', format: ['PascalCase'] },
      ],
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/strict-boolean-expressions': 'error',
    },
  },
);
