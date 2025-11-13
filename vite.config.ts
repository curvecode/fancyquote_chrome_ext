import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'background.ts'),
        content: resolve(__dirname, 'content.ts'),
        popup: resolve(__dirname, 'popup.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    sourcemap: true,
    minify: false, // Keep false for easier debugging
    target: 'es2020'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './')
    }
  },
  publicDir: false, // Disable copying public directory
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
});