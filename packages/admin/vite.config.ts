import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3002,
    host: '0.0.0.0',
    // Admin API'ye aynı origin üzerinden konuşur (prod: nginx, dev: bu proxy)
    proxy: {
      '/api': process.env.API_URL || 'http://localhost:3001',
      '/uploads': process.env.API_URL || 'http://localhost:3001',
    },
  },
})
