import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', '.husky', '*.config.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { project: ['./tsconfig.app.json', './tsconfig.node.json'] },
    },
    plugins: { react, 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    settings: { react: { version: '18.3' } },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='Math'][property.name='random']",
          message: 'Math.random is banned. Use src/systems/rng.ts (BUILD_GUIDE §5).',
        },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'src/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
  {
    // Game logic and helpers must not bypass the system layer.
    // _shared/ is the bridge layer; *Page.tsx files are UI and may read from stores.
    files: ['src/games/**/*.{ts,tsx}'],
    ignores: ['src/games/_shared/**', 'src/games/**/*Page.tsx', 'src/games/**/*Page.test.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/db/*', '@/db'],
              message:
                'Games must not touch the DB directly. Go through src/systems/* (BUILD_GUIDE §3).',
            },
            {
              group: ['@/store/*', '@/store'],
              message:
                'Games must not touch stores directly. Go through src/systems/* (BUILD_GUIDE §3).',
            },
          ],
        },
      ],
    },
  },
  prettier,
);
