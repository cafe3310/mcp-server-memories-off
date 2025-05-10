// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin'

export default tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    {
        plugins: {
            '@stylistic': stylistic
        },
        rules: {
            '@stylistic/indent': ['error', 2],
        },
    },
    {
        ignores: ['dist/**', 'node_modules/**'],
        rules: {
            'camelcase': 'error',
            'curly': 'error',
            'default-case': 'error',
            'default-case-last': 'error',
            'yoda': 'error',
            'strict': 'error',
        },
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
