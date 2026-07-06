// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const eslintConfig = [
  {
    ignores: [
      'sandbox/**',
      '.next/**',
      'node_modules/**',
      'coverage/**',
      '**/*.config.js',
      '**/*.config.cjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];

export default eslintConfig;
