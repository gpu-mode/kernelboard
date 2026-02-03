import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig, type UserConfig} from 'vite'

export default defineConfig({
  plugins: [react()],
  base: '/',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/tests/setup.ts',
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:5000',
      '/static': 'http://127.0.0.1:5000',
    }
  },
  build: {
    outDir: path.resolve(__dirname, '../kernelboard/static/app'),
    emptyOutDir: true,
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
} as UserConfig)
