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
      '/api/uk-cf-ocds': {
        target: 'https://www.contractsfinder.service.gov.uk',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/uk-cf-ocds/, '/Published/Notices/OCDS/Search'),
      },
      '/api/prozorro': {
        target: 'https://public-api.prozorro.gov.ua',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/prozorro/, '/api/2.5'),
      },
      '/api/za-etenders': {
        target: 'https://ocds-api.etenders.gov.za',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/za-etenders/, '/api/OCDSReleases'),
      },
    },
  },
});
