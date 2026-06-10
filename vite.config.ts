import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/ted': {
        target: 'https://api.ted.europa.eu',
        changeOrigin: true,
        rewrite: () => '/v3/notices/search',
      },
    },
  },
});
