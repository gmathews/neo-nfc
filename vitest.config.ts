import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        tsconfigPaths: true,
    },
    test: {
        globals: true,
        clearMocks: true,
        restoreMocks: true,
        typecheck: {
            enabled: true,
        },
        coverage: {
            reporter: ['html', 'text'],
        },
    },
});
