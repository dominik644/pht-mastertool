import {
  adminEmail,
  clearSessionCookieHeader,
  createSessionToken,
  findUserForLogin,
  getSessionFromRequest,
  guardAppAuth,
  hasAppAuthConfig,
  isAdminUser,
  mergeUsers,
  parseEnvUsers,
  sessionCookieHeader,
} from '../lib/appAuth.js';
import {
  createDbUser,
  deleteDbUser,
  fetchDbUsers,
  hasAppUsersDb,
  listUsersPublic,
  updateDbUser,
} from '../lib/supabaseAppUsers.js';

function resolveRoute(req) {
  const routeParam = req.query?.route;
  if (routeParam) return routeParam;
  const original = String(req.headers?.['x-vercel-original-url'] || req.headers?.['x-original-url'] || req.url || '');
  const path = original.split('?')[0];
  if (path.includes('/login')) return 'login';
  if (path.includes('/logout')) return 'logout';
  if (path.includes('/users')) return 'users';
  return 'me';
}

async function loadAllUsers() {
  const envUsers = parseEnvUsers();
  const dbUsers = await fetchDbUsers();
  return mergeUsers(envUsers, dbUsers);
}

async function resolveUserProfile(email) {
  const users = await loadAllUsers();
  const match = users.find((u) => u.email === email);
  if (!match || match.disabled) return null;
  return {
    email: match.email,
    name: match.name ?? match.email.split('@')[0],
    admin: isAdminUser(match),
  };
}

async function handleLogin(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'E-Mail und Passwort erforderlich' });
  }
  if (!hasAppAuthConfig()) {
    return res.status(503).json({ error: 'App-Login nicht konfiguriert (APP_USERS in Vercel setzen)' });
  }
  const users = await loadAllUsers();
  const user = findUserForLogin(users, email, password);
  if (!user) {
    return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
  }
  const token = createSessionToken(user.email);
  res.setHeader('Set-Cookie', sessionCookieHeader(token));
  const profile = await resolveUserProfile(user.email);
  return res.status(200).json({ ok: true, user: profile });
}

async function handleLogout(_req, res) {
  res.setHeader('Set-Cookie', clearSessionCookieHeader());
  return res.status(200).json({ ok: true });
}

async function handleMe(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!hasAppAuthConfig()) {
    return res.status(200).json({
      ok: true,
      configured: false,
      user: process.env.NODE_ENV !== 'production' ? { email: 'dev@local', name: 'Dev', admin: true } : null,
    });
  }
  const session = getSessionFromRequest(req);
  if (!session) {
    return res.status(200).json({ ok: true, configured: true, user: null });
  }
  const profile = await resolveUserProfile(session.email);
  if (!profile) {
    res.setHeader('Set-Cookie', clearSessionCookieHeader());
    return res.status(200).json({ ok: true, configured: true, user: null });
  }
  return res.status(200).json({ ok: true, configured: true, user: profile });
}

async function handleUsers(req, res) {
  const guard = guardAppAuth(req, res, { allowUnconfigured: false });
  if (!guard.ok) return;
  const profile = await resolveUserProfile(guard.user.email);
  if (!profile?.admin) {
    return res.status(403).json({ error: 'Nur für Administratoren' });
  }

  if (req.method === 'GET') {
    const envUsers = parseEnvUsers().map((u) => ({
      email: u.email,
      name: u.name,
      admin: isAdminUser(u),
      disabled: Boolean(u.disabled),
      source: 'env',
      editable: false,
    }));
    const dbUsers = hasAppUsersDb()
      ? (await listUsersPublic()).map((u) => ({
        email: u.email,
        name: u.name,
        admin: u.admin,
        disabled: u.disabled,
        source: 'db',
        editable: true,
      }))
      : [];
    const byEmail = new Map(envUsers.map((u) => [u.email, u]));
    for (const u of dbUsers) byEmail.set(u.email, u);
    return res.status(200).json({
      ok: true,
      users: [...byEmail.values()],
      dbEnabled: hasAppUsersDb(),
      adminEmail: adminEmail(),
      envOnly: !hasAppUsersDb(),
    });
  }

  if (req.method === 'POST') {
    if (!hasAppUsersDb()) {
      return res.status(503).json({
        error: 'Benutzer können nur mit Supabase app_users verwaltet werden. Env-Benutzer in Vercel → APP_USERS pflegen.',
        envOnly: true,
      });
    }
    const { email, password, name, admin } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'E-Mail und Passwort erforderlich' });
    }
    const result = await createDbUser({ email, password, name, admin });
    if (!result.ok) return res.status(400).json({ error: result.error });
    return res.status(201).json({ ok: true });
  }

  if (req.method === 'PATCH') {
    if (!hasAppUsersDb()) {
      return res.status(503).json({ error: 'Nur Supabase-Benutzer sind editierbar', envOnly: true });
    }
    const { email, disabled, admin, password } = req.body ?? {};
    if (!email) return res.status(400).json({ error: 'E-Mail erforderlich' });
    const result = await updateDbUser({ email, disabled, admin, password });
    if (!result.ok) return res.status(400).json({ error: result.error });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    if (!hasAppUsersDb()) {
      return res.status(503).json({ error: 'Env-Benutzer können nicht gelöscht werden', envOnly: true });
    }
    const email = req.body?.email ?? req.query?.email;
    if (!email) return res.status(400).json({ error: 'E-Mail erforderlich' });
    const result = await deleteDbUser(String(email));
    if (!result.ok) return res.status(400).json({ error: result.error });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const route = resolveRoute(req);
  if (route === 'login') return handleLogin(req, res);
  if (route === 'logout') return handleLogout(req, res);
  if (route === 'users') return handleUsers(req, res);
  return handleMe(req, res);
}
