import tseslint from 'typescript-eslint';
export default tseslint.config(
  {ignores: ['**/dist/**', '**/node_modules/**', '**/.expo/**']},
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}],
    },
  },
);
