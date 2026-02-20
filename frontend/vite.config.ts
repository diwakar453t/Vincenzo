import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Bundle visualizer — only runs in 'analyze' mode
    mode === 'analyze' &&
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
    }),
  ].filter(Boolean),

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },

  build: {
    target: 'esnext',
    minify: 'esbuild',
    // Warn if any single chunk exceeds 500KB
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Split vendors into separate cacheable chunks
        manualChunks(id) {
          // React core
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router-dom/')
          ) {
            return 'vendor-react';
          }
          // MUI / Emotion
          if (
            id.includes('node_modules/@mui/') ||
            id.includes('node_modules/@emotion/')
          ) {
            return 'vendor-mui';
          }
          // Redux
          if (
            id.includes('node_modules/@reduxjs/') ||
            id.includes('node_modules/react-redux/')
          ) {
            return 'vendor-redux';
          }
          // Recharts (charting library is large)
          if (id.includes('node_modules/recharts/') || id.includes('node_modules/d3')) {
            return 'vendor-charts';
          }
          // Forms
          if (
            id.includes('node_modules/react-hook-form/') ||
            id.includes('node_modules/@hookform/') ||
            id.includes('node_modules/yup/')
          ) {
            return 'vendor-forms';
          }
          // Date / HTTP utilities
          if (
            id.includes('node_modules/axios/') ||
            id.includes('node_modules/date-fns/') ||
            id.includes('node_modules/dayjs/')
          ) {
            return 'vendor-utils';
          }
        },
        // Deterministic chunk file names for long-term caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
  },

  test: {
    // Vitest configuration
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    css: true,
    reporters: ['verbose', 'html'],
    outputFile: {
      html: './test-results/index.html',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        global: {
          statements: 60,
          branches: 55,
          functions: 60,
          lines: 60,
        },
      },
      exclude: [
        'node_modules/**',
        'src/tests/**',
        '**/*.d.ts',
        '**/*.config.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
    },
    // Mock environment variables
    env: {
      VITE_API_URL: 'http://localhost:8000/api/v1',
    },
  },
}))
