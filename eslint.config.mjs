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
            '@stylistic/indent': ['error', 2, {
                // 允许函数调用时的额外缩进
                CallExpression: { arguments: 'first' },
                // 允许函数声明时的额外缩进
                FunctionDeclaration: { parameters: 'first' }
            }],
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
            '@typescript-eslint/no-unused-vars': ['warn', {
                "args": "all",
                "argsIgnorePattern": "^_",
                "caughtErrors": "all",
                "caughtErrorsIgnorePattern": "^_",
                "destructuredArrayIgnorePattern": "^_",
                "varsIgnorePattern": "^_",
                "ignoreRestSiblings": true
            }]
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
