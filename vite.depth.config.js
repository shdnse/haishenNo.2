import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  resolve: {
    alias: {
      '@': path.resolve(projectRoot, 'src')
    }
  },
  build: {
    minify: 'oxc',
    outDir: 'assets/depth-carousel',
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: path.resolve(projectRoot, 'src/depth-carousel-entry.jsx'),
      formats: ['es'],
      fileName: 'depth-carousel'
    },
    rollupOptions: {
      output: {
        assetFileNames: 'depth-carousel.[ext]'
      }
    }
  }
});
