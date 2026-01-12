
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Asegura que los archivos se encuentren en GitHub Pages
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});
