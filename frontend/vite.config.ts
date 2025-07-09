import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/kb/',
  build: {
    outDir: path.resolve(__dirname, '../kernelboard/static/kb'),
    emptyOutDir: true,
  },
  server: {
    
    proxy: {
      '/api': 'http://127.0.0.1:5000',
    }
  }
})
