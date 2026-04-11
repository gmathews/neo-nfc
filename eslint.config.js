// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

export default tseslint.config(
    {
        ignores: ['coverage/**', 'dist/**', 'drizzle/**', 'eslint.config.js', 'vitest.config.ts', 'drizzle.config.ts'],
    },
    eslint.configs.recommended,
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    stylistic.configs.customize({
        indent: 4,
        quotes: 'single',
        semi: true,
        jsx: false,
        braceStyle: '1tbs',
        quoteProps: 'as-needed',
    }),
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
            },
        },
        rules: {
            '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
        },
    },
);
