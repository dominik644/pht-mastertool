import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const projectRoot = dirname(fileURLToPath(import.meta.url));

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
              const { fetchOeffentlichevergabeTenders, OEFFENTLICHEVERGABE_MAX_DAYS, OEFFENTLICHEVERGABE_DEFAULT_DAYS } = await import('./lib/tenders/oeffentlichevergabeFetch.js');
              const url = new URL(req.url || '/', 'http://localhost');
              const days = Math.min(
                Number(url.searchParams.get('days')) || OEFFENTLICHEVERGABE_DEFAULT_DAYS,
                OEFFENTLICHEVERGABE_MAX_DAYS,
              );
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

          server.middlewares.use('/api/tenders-db', async (req, res) => {
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
              process.env.SUPABASE_URL = env.SUPABASE_URL || process.env.SUPABASE_URL;
              process.env.SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
              process.env.SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;
              const { fetchTendersFromSupabase, fetchAllTendersFromSupabase, getIngestState, hasSupabaseReadConfig, DEFAULT_PAGE_SIZE, MAX_API_PAGE_SIZE } = await import('./lib/supabaseIngest.js');
              if (!hasSupabaseReadConfig()) {
                res.statusCode = 503;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Supabase nicht konfiguriert', skipped: true }));
                return;
              }
              const url = new URL(req.url || '/', 'http://localhost');
              const since = url.searchParams.get('since') || undefined;
              const fetchAll = url.searchParams.get('all') === '1' || url.searchParams.get('all') === 'true';
              const pageRaw = url.searchParams.get('page');
              const limitRaw = url.searchParams.get('limit');
              const cursorRaw = url.searchParams.get('cursor');
              const page = pageRaw ? Number(pageRaw) : 1;
              const limit = limitRaw ? Number(limitRaw) : DEFAULT_PAGE_SIZE;
              const cursor = cursorRaw ? Number(cursorRaw) : 0;
              const result = fetchAll
                ? await fetchAllTendersFromSupabase({ since })
                : await fetchTendersFromSupabase({
                  since,
                  page: page && Number.isFinite(page) && page > 0 ? page : 1,
                  limit: limit && Number.isFinite(limit) && limit > 0
                    ? Math.min(limit, MAX_API_PAGE_SIZE)
                    : DEFAULT_PAGE_SIZE,
                  cursor: cursor && Number.isFinite(cursor) && cursor >= 0 ? cursor : 0,
                });
              if (!result.ok) {
                res.statusCode = result.skipped ? 503 : 502;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: result.error || 'Supabase-Fehler' }));
                return;
              }
              const tenders = result.tenders ?? [];
              const regions = [...new Set(tenders.map((t) => t.region).filter(Boolean))].sort();
              const ingestMeta = await getIngestState('last_ingest');
              const relevantTotal = ingestMeta?.total ?? null;
              const dbRowTotal = result.estimatedDbTotal ?? null;
              const total = fetchAll
                ? tenders.length
                : (result.hasMore ? (relevantTotal ?? tenders.length) : tenders.length);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                tenders,
                source: 'supabase-db',
                regions,
                total,
                estimatedTotal: fetchAll ? tenders.length : (relevantTotal ?? tenders.length),
                relevantTotal,
                dbRowTotal,
                page: result.page ?? page,
                cursor: result.cursor ?? cursor,
                hasMore: result.hasMore ?? false,
                cached: result.cached ?? undefined,
                isDemo: false,
                providerCount: ingestMeta?.providerCount ?? 1,
                liveProviders: ['Supabase'],
              }));
            } catch (err) {
              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Proxy error' }));
            }
          });

          server.middlewares.use('/api/translate', async (req, res) => {
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
                const { handleTranslateRequest } = await import('./lib/translate/handler.js');
                const result = await handleTranslateRequest(
                  body,
                  env.OPENAI_API_KEY || '',
                  env.OPENAI_MODEL || 'gpt-4o-mini',
                );
                res.statusCode = result.error && result.translations.length === 0 ? 400 : 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(result));
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  translations: [],
                  error: err instanceof Error ? err.message : 'Unknown',
                }));
              }
            });
          });

          server.middlewares.use('/api/analyze-tender', async (req, res) => {
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
                const { handleAnalyzeTenderRequest } = await import('./lib/analyzeTender/handler.js');
                const result = await handleAnalyzeTenderRequest(
                  body,
                  env.OPENAI_API_KEY || '',
                  env.OPENAI_MODEL || 'gpt-4o-mini',
                );
                res.statusCode = result.error && result.mode === 'error' ? 400 : 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(result));
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown' }));
              }
            });
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

          const mountVercelApi = (path: string, modulePath: string, opts?: { passOptions?: boolean; route?: string }) => {
            server.middlewares.use(path, async (req, res) => {
              if (req.method === 'OPTIONS' && !opts?.passOptions) {
                res.statusCode = 200;
                res.end();
                return;
              }
              process.env.SUPABASE_URL = env.SUPABASE_URL || process.env.SUPABASE_URL;
              process.env.SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
              process.env.SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;
              process.env.BC_TENANT_ID = env.BC_TENANT_ID || process.env.BC_TENANT_ID;
              process.env.BC_CLIENT_ID = env.BC_CLIENT_ID || process.env.BC_CLIENT_ID;
              process.env.BC_CLIENT_SECRET = env.BC_CLIENT_SECRET || process.env.BC_CLIENT_SECRET;
              process.env.BC_ENVIRONMENT = env.BC_ENVIRONMENT || process.env.BC_ENVIRONMENT;
              process.env.BC_COMPANY_ID = env.BC_COMPANY_ID || process.env.BC_COMPANY_ID;
              process.env.SCHEDULE_TOKEN_SECRET = env.SCHEDULE_TOKEN_SECRET || process.env.SCHEDULE_TOKEN_SECRET;
              process.env.RESEND_API_KEY = env.RESEND_API_KEY || process.env.RESEND_API_KEY;
              process.env.RESEND_FROM = env.RESEND_FROM || process.env.RESEND_FROM;
              process.env.SCHEDULE_EMAIL_FROM = env.SCHEDULE_EMAIL_FROM || process.env.SCHEDULE_EMAIL_FROM;
              process.env.SCHEDULE_PUBLIC_BASE_URL = env.SCHEDULE_PUBLIC_BASE_URL || process.env.SCHEDULE_PUBLIC_BASE_URL;
              process.env.SCHEDULE_SALES_NOTIFY_EMAIL = env.SCHEDULE_SALES_NOTIFY_EMAIL || process.env.SCHEDULE_SALES_NOTIFY_EMAIL;
              process.env.INGEST_ALERT_EMAIL = env.INGEST_ALERT_EMAIL || process.env.INGEST_ALERT_EMAIL;
              process.env.MS_GRAPH_CLIENT_ID = env.MS_GRAPH_CLIENT_ID || process.env.MS_GRAPH_CLIENT_ID;
              process.env.MS_GRAPH_CLIENT_SECRET = env.MS_GRAPH_CLIENT_SECRET || process.env.MS_GRAPH_CLIENT_SECRET;
              process.env.MS_GRAPH_TENANT_ID = env.MS_GRAPH_TENANT_ID || process.env.MS_GRAPH_TENANT_ID;
              process.env.INGEST_ALERT_FROM = env.INGEST_ALERT_FROM || process.env.INGEST_ALERT_FROM;
              process.env.APP_SESSION_SECRET = env.APP_SESSION_SECRET || process.env.APP_SESSION_SECRET;
              process.env.APP_USERS = env.APP_USERS || process.env.APP_USERS;
              process.env.APP_ADMIN_EMAIL = env.APP_ADMIN_EMAIL || process.env.APP_ADMIN_EMAIL;

              const url = new URL(req.url || '/', 'http://localhost');
              const query = Object.fromEntries(url.searchParams.entries());
              if (opts?.route) query.route = opts.route;
              const chunks: Buffer[] = [];
              req.on('data', (c) => chunks.push(c));
              req.on('end', async () => {
                try {
                  const moduleFile = join(projectRoot, modulePath.replace(/^\.\//, ''));
                  const handler = (await import(pathToFileURL(moduleFile).href)).default;
                  let body: unknown;
                  if (chunks.length) {
                    try {
                      body = JSON.parse(Buffer.concat(chunks).toString());
                    } catch {
                      body = undefined;
                    }
                  }
                  await handler(
                    { method: req.method, query, body, headers: req.headers as Record<string, string | string[] | undefined> },
                    {
                      setHeader: (k: string, v: string) => { res.setHeader(k, v); },
                      status: (code: number) => ({
                        json: (data: unknown) => {
                          res.statusCode = code;
                          res.setHeader('Content-Type', 'application/json');
                          res.end(JSON.stringify(data));
                        },
                        send: (data: string) => {
                          res.statusCode = code;
                          const isHtml = typeof data === 'string' && data.trimStart().startsWith('<!');
                          res.setHeader('Content-Type', isHtml ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8');
                          res.end(data);
                        },
                        end: () => { res.statusCode = code; res.end(); },
                      }),
                    },
                  );
                } catch (err) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'API error' }));
                }
              });
            });
          };

          mountVercelApi('/api/bc-sync', './api/bc-sync.js');
          mountVercelApi('/api/bc-documents', './api/bc-documents.js');
          mountVercelApi('/api/bc-salespeople', './api/bc-salespeople.js');
          mountVercelApi('/api/sales-sync', './api/sales-sync.js');
          mountVercelApi('/api/auth/me', './api/auth.js', { passOptions: true, route: 'me' });
          mountVercelApi('/api/auth/login', './api/auth.js', { passOptions: true, route: 'login' });
          mountVercelApi('/api/auth/logout', './api/auth.js', { passOptions: true, route: 'logout' });
          mountVercelApi('/api/auth/users', './api/auth.js', { passOptions: true, route: 'users' });
          mountVercelApi('/api/auth/change-password', './api/auth.js', { passOptions: true, route: 'change-password' });
          mountVercelApi('/api/schedule-proposal', './api/schedule.js', { passOptions: true, route: 'proposal' });
          mountVercelApi('/api/schedule-confirm', './api/schedule.js', { route: 'confirm' });
          mountVercelApi('/api/schedule-wish', './api/schedule.js', { passOptions: true, route: 'wish' });
          mountVercelApi('/book/wish', './api/schedule.js', { passOptions: true, route: 'wish' });
          mountVercelApi('/api/schedule-wish-accept', './api/schedule.js', { passOptions: true, route: 'wish-accept' });
          mountVercelApi('/api/schedule-custom-requests', './api/schedule.js', { route: 'custom-requests' });
          mountVercelApi('/api/calendar-busy', './api/schedule.js', { passOptions: true, route: 'calendar-busy' });
          mountVercelApi('/api/schedule-send', './api/schedule.js', { passOptions: true, route: 'send' });
          mountVercelApi('/api/schedule-eml', './api/schedule.js', { passOptions: true, route: 'eml' });
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
        '/api/tenders/tenderned-tns': {
          target: 'https://www.tenderned.nl',
          changeOrigin: true,
          rewrite: (path) =>
            path.replace(/^\/api\/tenders\/tenderned-tns/, '/papi/tenderned-rs-tns/v2/publicaties'),
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
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              if (id.includes('lib/priceListKeywords') || id.includes('lib/phtMatchRules')) {
                return 'matching-keywords';
              }
              if (id.includes('lib/tenders/') || id.includes('lib/globalTenderSearch')) {
                return 'matching-providers';
              }
              if (
                id.includes('lib/phtScoring')
                || id.includes('tenderPipeline')
                || id.includes('tenderAdapter')
              ) {
                return 'matching-pipeline';
              }
              return undefined;
            }
            if (id.includes('react-dom') || id.includes('react-router')) return 'vendor-react';
            if (id.includes('react/')) return 'vendor-react';
            if (id.includes('date-fns')) return 'vendor-date';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('@azure/msal')) return 'vendor-msal';
            if (id.includes('leaflet') || id.includes('react-leaflet')) return 'vendor-leaflet';
            return 'vendor';
          },
        },
      },
    },
  };
});

