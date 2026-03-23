import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Drop console/debugger calls during minification (top-level esbuild option)
  esbuild: {
    drop: ['console', 'debugger']
  },
  build: {
    // Target modern browsers — smaller, faster output
    target: 'es2020',
    rollupOptions: {
      output: {
        // Function form handles both static and dynamic imports consistently
        manualChunks(id) {
          // Core React runtime — always needed, aggressively cached
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor'
          }
          // Router — medium-churn, cache separately
          if (id.includes('node_modules/react-router-dom/') || id.includes('node_modules/react-router/')) {
            return 'router'
          }
          // Icon library — large, rarely changes
          if (id.includes('@fortawesome')) {
            return 'icons'
          }
          // HTTP client
          if (id.includes('node_modules/axios/')) {
            return 'axios'
          }
          // Group all remaining node_modules together
          if (id.includes('node_modules/')) {
            return 'vendor'
          }
          // Page-level chunks — each only loads when the route is visited
          if (id.includes('/pages/AllNews')    || id.includes('/pages/AllOpinions') ||
              id.includes('/pages/AllVideos')  || id.includes('/pages/AllPodcasts')) {
            return 'pages-all'
          }
          if (id.includes('/pages/Category')) {
            return 'page-category'
          }
          if (id.includes('/pages/Search') || id.includes('/pages/Following')) {
            return 'pages-misc'
          }
          // Section components stay in the default chunk with the pages that use them
        }
      }
    },
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

