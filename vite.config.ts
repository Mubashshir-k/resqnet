import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    open: true,
    allowedHosts: ['resqnet.loca.lt', 'localhost', '10.161.148.222'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
