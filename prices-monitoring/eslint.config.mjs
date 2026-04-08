// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      indent: ['off', 'spaces', 2],
      'linebreak-style': ['off', 'windows'],
      quotes: ['warn', 'single'],
      semi: ['warn', 'never'],
      curly: ['warn', 'multi-line'],
      eqeqeq: 'off',
      'no-trailing-spaces': 'warn',
      'no-multiple-empty-lines': 'off',
      'no-inline-comments': 'off',
      'no-explicit-any': 'off',
      'prefer-const': 'off',
      'import/prefer-default-export': 'off',
      'no-inner-declarations': 'off',
      'no-empty-pattern': 'off',
      'no-prototype-builtins': 'off',
      camelcase: 'warn',
      'no-tabs': ['error', { allowIndentationTabs: true }],
      'prettier/prettier': ['off', { endOfLine: 'auto' }],
      'no-async-promise-executor': 'off',
      'no-constant-condition': 'warn',
      'no-empty': 'warn',
      'no-unused-expressions': ['warn', { allowTaggedTemplates: true }],
    },
  },
);
