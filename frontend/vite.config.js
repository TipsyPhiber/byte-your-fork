import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Local backend port. 5000 is taken by another service on this dev box
// (kavita), so the backend's .env sets PORT=5001. Override with
// BACKEND_PORT if your backend runs elsewhere.
const backendPort = process.env.BACKEND_PORT ?? '5001'
const backend = `http://localhost:${backendPort}`

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: backend,
        changeOrigin: true,
      },
      '/ws': {
        target: `ws://localhost:${backendPort}`,
        ws: true,
      },
      '/uploads': {
        target: backend,
        changeOrigin: true,
      },
    },
  },
})
