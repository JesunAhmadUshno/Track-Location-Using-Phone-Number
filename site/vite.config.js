import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// The site reads ../results/*.json and ../main.py at build time, so every number on the page is generated, never typed.
export default defineConfig({
  base: '/Track-Location-Using-Phone-Number/',
  plugins: [react()],
  server: { fs: { allow: ['..'] } },
});
