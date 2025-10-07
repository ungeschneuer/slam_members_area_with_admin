import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: '.',
  
  // Safe defines (avoid forcing DEV true which can affect builds)
  define: {
    'process.env': {},
    'process.platform': JSON.stringify('browser'),
    'process.version': JSON.stringify('v16.0.0')
  },
  server: {
    port: 5173,
    host: true,
    sourcemapIgnoreList: false,
    // Dev server options
    middlewareMode: false,
    hmr: {
      overlay: false, // Disable error overlay for source map issues
      port: 5173, // Align HMR WebSocket with dev server port
      host: 'localhost'
    },
    // Proxy API requests to backend server
    proxy: {
      '/api': {
        target: 'http://localhost:3005',
        changeOrigin: true,
        secure: false
      }
    },
    // Suppress source map errors
    fs: {
      strict: false
    },
    // Suppress source map warnings
    onwarn(warning, warn) {
      if (warning.code === 'SOURCEMAP_ERROR') {
        return;
      }
      warn(warning);
    }
  },
  build: {
    target: 'esnext',
    // Enable sourcemaps for development, disable for production
    sourcemap: process.env.NODE_ENV === 'development',
    outDir: '../dist',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          query: ['@tanstack/react-query'],
          socketio: ['socket.io-client'],
          leaflet: ['leaflet']
        }
      }
    },
    // Production optimizations
    minify: process.env.NODE_ENV === 'production' ? 'terser' : false,
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1500
  },
  css: {
    // Enable sourcemaps for development
    devSourcemap: process.env.NODE_ENV === 'development'
  },
  // Optimize dependencies to prevent source map issues
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  },
  // Handle source map errors gracefully
  esbuild: {
    sourcemap: process.env.NODE_ENV === 'development'
  }
})

