import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDefaultAppUsers } from './defaultAppUsers.js';
import { hashPassword } from './appAuth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '../data/app-users.json');
const TMP_DATA_FILE = path.join(process.env.TMPDIR || '/tmp', 'pht-app-users.json');

function resolveDataFile() {
  if (process.env.APP_USERS_FILE?.trim()) return process.env.APP_USERS_FILE.trim();
  if (process.env.VERCEL) return TMP_DATA_FILE;
  return DATA_FILE;
}

function readStore() {
  const candidates = [resolveDataFile(), DATA_FILE, TMP_DATA_FILE];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      // try next
    }
  }
  return null;
}

function writeStore(payload) {
  const file = resolveDataFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
}

/** @returns {import('./defaultAppUsers.js').DefaultAppUser[]} */
export function loadFileAppUsers() {
  const store = readStore();
  if (store?.users?.length) {
    return store.users.map((u) => ({
      username: u.username,
      email: String(u.email).toLowerCase(),
      name: u.name,
      admin: Boolean(u.admin),
      salesRep: u.salesRep ?? u.name,
      passwordHash: u.passwordHash,
      mustChangePassword: u.mustChangePassword !== false,
      disabled: Boolean(u.disabled),
      bcSalespersonCode: u.bcSalespersonCode ?? undefined,
      source: 'file',
    }));
  }
  return buildDefaultAppUsers();
}

export function hasFileAppUsers() {
  return fs.existsSync(DATA_FILE) || true;
}

/** Persist users (password change, admin flag). Returns false if not writable. */
export function saveFileAppUsers(users) {
  try {
    writeStore({
      updatedAt: new Date().toISOString(),
      users: users.map((u) => ({
        username: u.username,
        email: u.email,
        name: u.name,
        admin: Boolean(u.admin),
        salesRep: u.salesRep ?? u.name,
        passwordHash: u.passwordHash,
        mustChangePassword: Boolean(u.mustChangePassword),
        disabled: Boolean(u.disabled),
        bcSalespersonCode: u.bcSalespersonCode ?? null,
      })),
    });
    return true;
  } catch (err) {
    console.warn('[fileAppUsers] Speichern fehlgeschlagen:', err.message);
    return false;
  }
}

/** @param {string} loginId username or email */
export function updateFileUserPassword(loginId, newPassword) {
  const users = loadFileAppUsers();
  const key = loginId.trim().toLowerCase();
  const compact = key.replace(/\s+/g, '');
  const idx = users.findIndex(
    (u) => u.email === key || (u.username && u.username.toLowerCase() === compact),
  );
  if (idx < 0) return { ok: false, error: 'Benutzer nicht gefunden' };
  users[idx] = {
    ...users[idx],
    passwordHash: hashPassword(newPassword),
    mustChangePassword: false,
  };
  if (!saveFileAppUsers(users)) {
    return { ok: false, error: 'Passwort konnte nicht gespeichert werden' };
  }
  return { ok: true, user: users[idx] };
}

/** @param {string} emailOrUsername @param {Partial<{ admin: boolean, disabled: boolean, bcSalespersonCode: string, salesRep: string, name: string }>} patch */
export function patchFileUser(emailOrUsername, patch) {
  const users = loadFileAppUsers();
  const key = emailOrUsername.trim().toLowerCase();
  const compact = key.replace(/\s+/g, '');
  const idx = users.findIndex(
    (u) => u.email === key || (u.username && u.username.toLowerCase() === compact),
  );
  if (idx < 0) return { ok: false, error: 'Benutzer nicht gefunden' };
  users[idx] = { ...users[idx], ...patch };
  if (!saveFileAppUsers(users)) return { ok: false, error: 'Speichern fehlgeschlagen' };
  return { ok: true, user: users[idx] };
}
