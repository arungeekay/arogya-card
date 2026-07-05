import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// AROGYA CARD frontend. base:'./' so FastAPI can serve dist/ from any mount path.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:8002', changeOrigin: true },
      '/mock': { target: 'http://127.0.0.1:8002', changeOrigin: true },
    },
  },
  preview: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:8002', changeOrigin: true },
      '/mock': { target: 'http://127.0.0.1:8002', changeOrigin: true },
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          charts: ['recharts'],
          motion: ['framer-motion'],
        },
      },
    },
  },
})
