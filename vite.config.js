import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true
  },
  server: {
    host: true,   // bind to 0.0.0.0 so phones on the same Wi-Fi can connect
    port: 5173,
  },
  // Drop console/debugger calls during minification (top-level esbuild option)
  esbuild: {
    drop: ['console', 'debugger']
  },
  build: {
    // Target modern browsers — smaller, faster output
    target: 'es2020',
    // Silence the warning for larger (but intentional) chunks
    chunkSizeWarningLimit: 800,
    sourcemap: false,
    minify: 'esbuild',
    // Enable CSS code splitting so each lazy page only loads its styles
    cssCodeSplit: true
  },
  // Pre-bundle these so the dev server starts faster
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios']
  }
})

