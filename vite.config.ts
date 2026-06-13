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
        name: 'api-dev-middleware',
        configureServer(server) {
          server.middlewares.use('/api/uk', async (req, res) => {
            if (req.method === 'OPTIONS') {
              res.statusCode = 204;
              res.end();
              return;
            }
            const url = new URL(req.url || '/', 'http://localhost');
            const target = url.searchParams.get('target');
            const routes: Record<string, { method: string; url: string }> = {
              contracts: {
                method: 'POST',
                url: 'https://www.contractsfinder.service.gov.uk/api/rest/2/search_notices/json',
              },
              'find-tender': {
                method: 'GET',
                url: 'https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages?limit=80&stages=tender',
              },
              'cf-ocds': {
                method: 'GET',
                url: 'https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?limit=60&stages=tender',
              },
            };
            const route = target ? routes[target] : null;
            if (!route || req.method !== route.method) {
              res.statusCode = route ? 405 : 404;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: route ? 'Method not allowed' : 'Unknown UK proxy target' }));
              return;
            }
            const chunks: Buffer[] = [];
            req.on('data', (c) => chunks.push(c));
            req.on('end', async () => {
              try {
                const init: RequestInit = {
                  method: route.method,
                  headers: { Accept: 'application/json' },
                };
                if (route.method === 'POST') {
                  init.headers = { ...init.headers, 'Content-Type': 'application/json' };
                  init.body = Buffer.concat(chunks).toString() || '{}';
                }
                const upstream = await fetch(route.url, init);
                const text = await upstream.text();
                res.statusCode = upstream.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(text);
              } catch (err) {
                res.statusCode = 502;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Proxy error' }));
              }
            });
          });

          server.middlewares.use('/api/tenders/oeffentlichevergabe', async (req, res) => {
            if (req.method === 'OPTIONS') {
              res.statusCode = 204;
              res.end();
              return;
            }
            if (req.method !== 'GET') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Method not allowed' }));
              return;
            }
            try {
              const { fetchOeffentlichevergabeTenders } = await import('./lib/tenders/oeffentlichevergabeFetch.js');
              const url = new URL(req.url || '/', 'http://localhost');
              const days = Math.min(Number(url.searchParams.get('days')) || 2, 3);
              const tenders = await fetchOeffentlichevergabeTenders({ days });
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ tenders, count: tenders.length }));
            } catch (err) {
              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Proxy error' }));
            }
          });

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
        '/api/tenders/doffin': {
          target: 'https://betaapi.doffin.no',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/tenders\/doffin/, '/public/v2/search'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const key = env.DOFFIN_API_KEY;
              if (key) proxyReq.setHeader('Ocp-Apim-Subscription-Key', key);
            });
          },
        },
        '/api/tenders/hilma': {
          target: 'https://api.hankintailmoitukset.fi',
          changeOrigin: true,
          rewrite: () => '/avp/eformnotices/docs/search',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const key = env.HILMA_API_KEY;
              if (key) proxyReq.setHeader('Ocp-Apim-Subscription-Key', key);
            });
          },
        },
        '/api/tenders/austender': {
          target: 'https://api.tenders.gov.au',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/tenders\/austender/, '/ocds'),
        },
        '/api/tenders/prozorro': {
          target: 'https://public-api.prozorro.gov.ua',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/tenders\/prozorro/, '/api/2.5'),
        },
        '/api/tenders/za-etenders': {
          target: 'https://ocds-api.etenders.gov.za',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/tenders\/za-etenders/, '/api/OCDSReleases'),
        },
        '/api/tenders/bbg': {
          target: 'https://www.bbg.gv.at',
          changeOrigin: true,
          rewrite: () => '/information/aktuelle-ausschreibungen',
        },
        '/api/tenders/simap': {
          target: 'https://www.simap.ch',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/tenders\/simap/, '/api/publications/v2/project/project-search'),
        },
        '/api/tenders/bund': {
          target: 'https://www.service.bund.de',
          changeOrigin: true,
          rewrite: () => '/Content/Globals/Functions/RSSFeed/RSSGenerator_Ausschreibungen.xml',
        },
        '/api/tenders/tenderned': {
          target: 'https://www.tenderned.nl',
          changeOrigin: true,
          rewrite: () => '/papi/tenderned-rs-tns/rss/laatste-publicatie.rss',
        },
        '/api/tenders/boamp': {
          target: 'https://boamp-datadila.opendatasoft.com',
          changeOrigin: true,
          rewrite: (path) =>
            path.replace(
              /^\/api\/tenders\/boamp/,
              '/api/explore/v2.1/catalog/datasets/boamp/records',
            ),
        },
        '/api/tenders/ezamowienia': {
          target: 'https://ezamowienia.gov.pl',
          changeOrigin: true,
          rewrite: (path) =>
            path.replace(/^\/api\/tenders\/ezamowienia/, '/mo-board/api/v1/notice'),
        },
        '/api/tenders/mtender': {
          target: 'https://public.mtender.gov.md',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/tenders\/mtender/, ''),
        },
        '/api/tenders/canadabuys': {
          target: 'https://canadabuys.canada.ca',
          changeOrigin: true,
          rewrite: () => '/opendata/pub/newTenderNotice-nouvelAvisAppelOffres.csv',
        },
      },
    },
  };
});
