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
      '/api/uk-contracts': {
        target: 'https://www.contractsfinder.service.gov.uk',
        changeOrigin: true,
        rewrite: () => '/api/rest/2/search_notices/json',
      },
      '/api/uk-find-tender': {
        target: 'https://www.find-tender.service.gov.uk',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/uk-find-tender/, '/api/1.0/ocdsReleasePackages'),
      },
    },
  },
});
