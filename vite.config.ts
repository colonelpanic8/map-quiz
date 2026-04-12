import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? './' : '/',
  plugins: [react()],
  preview: {
    host: '0.0.0.0',
  },
  server: {
    host: '0.0.0.0',
  },
}))
