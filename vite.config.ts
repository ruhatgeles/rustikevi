import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  server: {
    allowedHosts: ['.ngrok-free.app'],
    // Geliştirmede /api ve /uploads isteklerini lokal API'ye ilet (prod'da server.mjs yapar)
    proxy: {
      '/api': process.env.API_URL || 'http://localhost:3001',
      '/uploads': process.env.API_URL || 'http://localhost:3001',
    },
  },
  plugins: [
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
