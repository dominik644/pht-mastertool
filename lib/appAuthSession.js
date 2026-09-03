import { buildUserProfile, guardAppAuth, mergeUsers, parseEnvUsers } from './appAuth.js';
import { fetchDbUsers } from './supabaseAppUsers.js';

export async function loadAllUsersMerged() {
  return mergeUsers(parseEnvUsers(), await fetchDbUsers());
}

/** Session guard + admin role – for Ausschreibungen / tender APIs. */
export async function guardTenderAdmin(req, res) {
  const guard = guardAppAuth(req, res);
  if (!guard.ok) return { ok: false };
  if (guard.unconfigured) {
    return { ok: true, user: { admin: true, role: 'admin' } };
  }
  const users = await loadAllUsersMerged();
  const profile = buildUserProfile(users.find((u) => u.email === guard.user.email));
  if (!profile) {
    res.status(401).json({ error: 'Benutzer nicht gefunden', authRequired: true });
    return { ok: false };
  }
  if (!profile.admin) {
    res.status(403).json({
      error: 'Ausschreibungen nur für Administratoren',
      adminRequired: true,
    });
    return { ok: false };
  }
  return { ok: true, user: profile };
}

/** Session guard + profile (any role). */
export async function guardSessionProfile(req, res, opts = {}) {
  const guard = guardAppAuth(req, res, opts);
  if (!guard.ok) return { ok: false };
  if (guard.unconfigured && process.env.NODE_ENV !== 'production') {
    return {
      ok: true,
      user: {
        email: 'dev@local',
        name: 'Dev',
        admin: true,
        role: 'admin',
        bcSalespersonCode: null,
        salesRep: 'Dev',
      },
    };
  }
  if (guard.public || guard.unconfigured) return { ok: true, user: null };
  const users = await loadAllUsersMerged();
  const profile = buildUserProfile(users.find((u) => u.email === guard.user.email));
  if (!profile) {
    res.status(401).json({ error: 'Benutzer nicht gefunden', authRequired: true });
    return { ok: false };
  }
  return { ok: true, user: profile };
}
