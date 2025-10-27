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
      port: 5173, // Development server port
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
    }
  },
  build: {
    target: 'esnext',
    // Disabled for security and performance
    sourcemap: false,
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Enable cache busting with hashed filenames
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          query: ['@tanstack/react-query'],
          leaflet: ['leaflet']
        }
      }
    },
    // Production optimizations
    minify: process.env.NODE_ENV === 'production' ? 'terser' : false,
    cssCodeSplit: false, // Keep single CSS file for simpler cache busting
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1500
  },
  css: {
    // Disabled for security and performance
    devSourcemap: false
  },
  // Optimize dependencies to prevent source map issues
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  },
  // Handle source map errors gracefully
  esbuild: {
    sourcemap: false
  }
})

