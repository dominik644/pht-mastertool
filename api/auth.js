import {
  adminEmail,
  buildUserProfile,
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
import { loadFileAppUsers, patchFileUser, updateFileUserPassword } from '../lib/fileAppUsers.js';
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
  if (path.includes('/change-password')) return 'change-password';
  if (path.includes('/users')) return 'users';
  return 'me';
}

async function loadAllUsers() {
  const envUsers = parseEnvUsers();
  const dbUsers = await fetchDbUsers();
  const fileUsers = loadFileAppUsers();
  return mergeUsers(envUsers, dbUsers, fileUsers);
}

async function resolveUserProfile(email) {
  const users = await loadAllUsers();
  const match = users.find((u) => u.email === email);
  return buildUserProfile(match);
}

async function handleLogin(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, username, password } = req.body ?? {};
  const loginId = username || email;
  if (!loginId || !password) {
    return res.status(400).json({ error: 'Benutzername und Passwort erforderlich' });
  }
  if (!hasAppAuthConfig()) {
    return res.status(503).json({ error: 'App-Login nicht konfiguriert (APP_USERS in Vercel setzen)' });
  }
  const users = await loadAllUsers();
  const user = findUserForLogin(users, loginId, password);
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
      user: process.env.NODE_ENV !== 'production'
        ? { email: 'dev@local', name: 'Dev', admin: true, role: 'admin', bcSalespersonCode: null, salesRep: 'Dev' }
        : null,
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

async function handleChangePassword(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const guard = guardAppAuth(req, res, { allowUnconfigured: false });
  if (!guard.ok) return;
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Aktuelles und neues Passwort erforderlich' });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'Neues Passwort: mindestens 6 Zeichen' });
  }
  const users = await loadAllUsers();
  const match = users.find((u) => u.email === guard.user.email);
  if (!match) return res.status(401).json({ error: 'Benutzer nicht gefunden' });
  const loginUser = findUserForLogin(users, match.email, currentPassword)
    ?? findUserForLogin(users, match.username ?? '', currentPassword);
  if (!loginUser) {
    return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });
  }
  if (hasAppUsersDb()) {
    const result = await updateDbUser({ email: match.email, password: newPassword });
    if (!result.ok) return res.status(400).json({ error: result.error });
  }
  const fileResult = updateFileUserPassword(match.email, newPassword);
  if (!fileResult.ok && !hasAppUsersDb()) {
    return res.status(500).json({ error: fileResult.error });
  }
  const profile = await resolveUserProfile(match.email);
  return res.status(200).json({ ok: true, user: profile });
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
      bcSalespersonCode: u.bcSalespersonCode ?? null,
      salesRep: u.salesRep ?? u.name ?? null,
      source: 'env',
      editable: false,
    }));
    const dbUsers = hasAppUsersDb()
      ? (await listUsersPublic()).map((u) => ({
        email: u.email,
        name: u.name,
        admin: u.admin,
        disabled: u.disabled,
        bcSalespersonCode: u.bcSalespersonCode ?? null,
        salesRep: u.salesRep ?? u.name ?? null,
        source: 'db',
        editable: true,
      }))
      : [];
    const fileUsers = loadFileAppUsers().map((u) => ({
      email: u.email,
      username: u.username,
      name: u.name,
      admin: Boolean(u.admin),
      disabled: Boolean(u.disabled),
      bcSalespersonCode: u.bcSalespersonCode ?? null,
      salesRep: u.salesRep ?? u.name ?? null,
      mustChangePassword: Boolean(u.mustChangePassword),
      source: 'file',
      editable: true,
    }));
    const byEmail = new Map(fileUsers.map((u) => [u.email, u]));
    for (const u of envUsers) byEmail.set(u.email, u);
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
    const { email, password, name, admin, bcSalespersonCode, salesRep } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'E-Mail und Passwort erforderlich' });
    }
    const result = await createDbUser({ email, password, name, admin, bcSalespersonCode, salesRep });
    if (!result.ok) return res.status(400).json({ error: result.error });
    return res.status(201).json({ ok: true });
  }

  if (req.method === 'PATCH') {
    const { email, username, disabled, admin, password, bcSalespersonCode, salesRep } = req.body ?? {};
    const id = email || username;
    if (!id) return res.status(400).json({ error: 'E-Mail oder Benutzername erforderlich' });

    const fileUsers = loadFileAppUsers();
    const fileMatch = fileUsers.find(
      (u) => u.email === String(id).toLowerCase() || u.username?.toLowerCase() === String(id).replace(/\s+/g, '').toLowerCase(),
    );
    if (fileMatch) {
      /** @type {Record<string, unknown>} */
      const patch = {};
      if (typeof disabled === 'boolean') patch.disabled = disabled;
      if (typeof admin === 'boolean') patch.admin = admin;
      if (bcSalespersonCode !== undefined) patch.bcSalespersonCode = bcSalespersonCode;
      if (salesRep !== undefined) patch.salesRep = salesRep;
      if (password) {
        const fileResult = updateFileUserPassword(fileMatch.email, password);
        if (!fileResult.ok) return res.status(400).json({ error: fileResult.error });
      } else if (Object.keys(patch).length > 0) {
        const result = patchFileUser(fileMatch.email, patch);
        if (!result.ok) return res.status(400).json({ error: result.error });
      }
      return res.status(200).json({ ok: true });
    }

    if (!hasAppUsersDb()) {
      return res.status(503).json({ error: 'Benutzer nicht in der lokalen Liste gefunden', envOnly: true });
    }
    const result = await updateDbUser({ email, disabled, admin, password, bcSalespersonCode, salesRep });
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
  if (route === 'change-password') return handleChangePassword(req, res);
  if (route === 'users') return handleUsers(req, res);
  return handleMe(req, res);
}
