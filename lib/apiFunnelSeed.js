import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { isAdminUser } from './appAuth.js';

const SEED_DIR = join(process.cwd(), 'funnel-seeds');

function ownerSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function userSlug(user) {
  return ownerSlug(user?.salesRep || user?.name || user?.email || '');
}

function canReadOwner(user, owner) {
  if (!user) return false;
  if (isAdminUser(user) || user.admin === true || user.role === 'admin') return true;
  const mine = userSlug(user);
  return mine && mine === ownerSlug(owner);
}

export async function handleFunnelSeed(req, res, user) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });

  if (String(req.query?.index || '') === '1') {
    const raw = join(SEED_DIR, 'index.json');
    if (!existsSync(raw)) return res.status(404).json({ error: 'Kein Funnel-Index' });
    const data = JSON.parse(readFileSync(raw, 'utf8'));
    const funnels = Array.isArray(data?.funnels) ? data.funnels : [];
    return res.status(200).json({
      ...data,
      funnels: funnels.filter((f) => canReadOwner(user, f.owner || f.file)),
    });
  }

  const owner = String(req.query?.owner || req.query?.file || '').replace(/\.json$/i, '');
  const slug = ownerSlug(owner).replace(/[^a-z0-9-]/g, '');
  if (!slug) return res.status(400).json({ error: 'owner fehlt' });
  if (!canReadOwner(user, slug)) return res.status(403).json({ error: 'Kein Zugriff auf diesen Funnel' });

  const file = join(SEED_DIR, `${basename(slug)}.json`);
  if (!existsSync(file)) return res.status(404).json({ error: 'Funnel nicht gefunden' });
  return res.status(200).json(JSON.parse(readFileSync(file, 'utf8')));
}
