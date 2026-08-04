import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // Relative base so the built app works on GitHub Pages (served from a
  // /<repo>/ subpath) and also if you just open dist/index.html directly.
  base: './',
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
})
