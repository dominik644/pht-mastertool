import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'assistant-api-dev',
        configureServer(server) {
          server.middlewares.use('/api/assistant', async (req, res) => {
            if (req.method === 'OPTIONS') {
              res.statusCode = 200;
              res.end();
              return;
            }
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Method not allowed' }));
              return;
            }

            const chunks: Buffer[] = [];
            req.on('data', (c) => chunks.push(c));
            req.on('end', async () => {
              try {
                const body = JSON.parse(Buffer.concat(chunks).toString());
                const { handleAssistantRequest } = await import('./lib/assistant/handler.js');
                const result = await handleAssistantRequest(
                  body,
                  env.OPENAI_API_KEY || '',
                  env.OPENAI_MODEL || 'gpt-4o-mini',
                );
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(result));
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  reply: 'Assistent-Fehler in der Entwicklungsumgebung.',
                  actions: [],
                  mode: 'error',
                  error: err instanceof Error ? err.message : 'Unknown',
                }));
              }
            });
          });
        },
      },
    ],
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
        '/api/bbg': {
          target: 'https://www.bbg.gv.at',
          changeOrigin: true,
          rewrite: () => '/information/aktuelle-ausschreibungen',
        },
        '/api/simap': {
          target: 'https://www.simap.ch',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/simap/, '/api/publications/v2/project/project-search'),
        },
        '/api/bund': {
          target: 'https://www.service.bund.de',
          changeOrigin: true,
          rewrite: () => '/Content/Globals/Functions/RSSFeed/RSSGenerator_Ausschreibungen.xml',
        },
      },
    },
  };
});
