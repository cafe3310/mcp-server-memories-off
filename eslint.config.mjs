// @ts-check
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';
import eslint from '@eslint/js';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    plugins: {
      '@stylistic': stylistic
    },
    rules: {
      '@stylistic/indent': ['error', 2, {
        CallExpression: {arguments: 'first'},
        FunctionDeclaration: {parameters: 'first'}
      }],
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
    rules: {
      camelcase: 'error',
      curly: 'error',
      'default-case': 'error',
      'default-case-last': 'error',
      yoda: 'error',
      strict: 'error',
      '@typescript-eslint/no-unused-vars': ['warn', {
        args: 'all',
        argsIgnorePattern: '^_',
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true
      }]
    },
  },
  {
    // relax for test files
    files: ['**/*.test.ts'],
    rules: {
      'strict': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
    }
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
