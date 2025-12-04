
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'; // Import path
import { fileURLToPath } from 'url'; // Import fileURLToPath

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': process.env
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Connects to the Node.js backend
        changeOrigin: true,
        secure: false,
      }
    }
  },
  resolve: {
    alias: {
      // Use path.resolve with fileURLToPath and import.meta.url for cross-platform compatibility
      '@': path.resolve(fileURLToPath(new URL('.', import.meta.url)), './'), 
    },
  },
});
