import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import perfectionist from 'eslint-plugin-perfectionist';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import * as regexpPlugin from 'eslint-plugin-regexp';
import sortDestructureKeys from 'eslint-plugin-sort-destructure-keys';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const jsConfigBase = {
  extends: [
    js.configs.recommended,
    regexpPlugin.configs['flat/recommended'],
    eslintConfigPrettier,
  ],
  plugins: {
    'perfectionist': perfectionist,
    'sort-destructure-keys': sortDestructureKeys,
  },
  rules: {
    'no-duplicate-imports': ['error', { allowSeparateTypeImports: true }],
    'no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],

    'perfectionist/sort-exports': 'error',
    'perfectionist/sort-imports': [
      'error',
      {
        newlinesBetween: 0,
        groups: [
          'value-builtin',
          'value-external',
          'value-internal',
          ['value-parent', 'value-sibling', 'value-index'],
          { newlinesBetween: 1 },
          'unknown',
        ],
      },
    ],
    'perfectionist/sort-named-imports': 'error',

    'sort-destructure-keys/sort-destructure-keys': 'error',
  },
};

export default tseslint.config(
  {
    files: ['eslint.config.js'],
    languageOptions: { ecmaVersion: 2020 },
    ...jsConfigBase,
  },
  {
    files: ['public/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node, ...globals.es2021 },
    },
    ...jsConfigBase,
  },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      jsxA11y.flatConfigs.recommended,
      reactPlugin.configs.flat.recommended,
      regexpPlugin.configs['flat/recommended'],
      eslintConfigPrettier,
    ],
    files: ['vite.config.ts', 'src/**/*.{ts,tsx}'],
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
      'perfectionist': perfectionist,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'sort-destructure-keys': sortDestructureKeys,
    },
    settings: { react: { version: '19.1.1' } },
    rules: {
      ...reactHooks.configs.recommended.rules,

      'no-duplicate-imports': ['error', { allowSeparateTypeImports: true }],

      'jsx-a11y/media-has-caption': 'off',

      'perfectionist/sort-exports': 'error',
      'perfectionist/sort-imports': [
        'error',
        {
          newlinesBetween: 0,
          tsconfig: { rootDir: '.', filename: 'tsconfig.app.json' },
          groups: [
            'value-builtin',
            'value-external',
            ['value-internal', 'value-tsconfig-path'],
            ['value-parent', 'value-sibling', 'value-index'],
            { newlinesBetween: 1 },
            'named-type-builtin',
            'named-type-external',
            ['named-type-internal', 'named-type-tsconfig-path'],
            ['named-type-parent', 'named-type-sibling', 'named-type-index'],
            'type-import',
            { newlinesBetween: 1 },
            'unknown',
          ],
        },
      ],
      'perfectionist/sort-intersection-types': ['error', { groups: ['named'] }],
      'perfectionist/sort-named-imports': 'error',
      'perfectionist/sort-object-types': ['error', { groups: ['unknown'] }],
      'perfectionist/sort-union-types': ['error', { groups: ['named'] }],

      'react/jsx-sort-props': [
        'error',
        { callbacksLast: true, shorthandLast: true, reservedFirst: true },
      ],
      'react/react-in-jsx-scope': 'off',

      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      'sort-destructure-keys/sort-destructure-keys': 'error',

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
