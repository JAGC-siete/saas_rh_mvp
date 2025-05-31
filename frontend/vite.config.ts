import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',  // Changed from '/' to './' for better static file handling
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@config': path.resolve(__dirname, './src/config'),
      '@services': path.resolve(__dirname, './src/services')
    }
  },
  server: {
    port: 3000,
    strictPort: true,
    host: true,
    cors: true
  },
  preview: {
    port: 4174,  // Updated to match your new port
    strictPort: true,
    host: true,
    cors: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom']
        }
      }
    },
    target: 'esnext',
    minify: 'terser',
    assetsDir: 'assets',  // Explicitly set assets directory
    emptyOutDir: true,    // Clean the output directory before build
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  }
})