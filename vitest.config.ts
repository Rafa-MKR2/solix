/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src-ts/test/setup.ts'],
    include: ['src-ts/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src-ts/**/*.ts'],
      exclude: [
        'src-ts/test/**',
        'src-ts/**/*.test.ts',
        'src-ts/**/*.d.ts',
        'src-ts/animations.ts',
        'src-ts/app.ts',
        'src-ts/utils.ts',
        'src-ts/types.ts',
        // Arquivos legados aguardando remoção (roadmap: médio prazo) —
        // não fazem parte da arquitetura features/ + shared/.
        'src-ts/ui.ts',
        'src-ts/operations.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src-ts'),
      '@/shared': path.resolve(__dirname, './src-ts/shared'),
      '@/features': path.resolve(__dirname, './src-ts/features'),
    },
  },
});