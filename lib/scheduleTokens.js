import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const DEFAULT_TTL_DAYS = 14;

const DEV_FALLBACK_SECRET = 'pht-dev-schedule-token-local-only';

function getSecret() {
  if (process.env.SCHEDULE_TOKEN_SECRET) return process.env.SCHEDULE_TOKEN_SECRET;
  if (process.env.CRON_SECRET) return process.env.CRON_SECRET;
  if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'production') {
    return DEV_FALLBACK_SECRET;
  }
  return null;
}

export function isDevScheduleTokenFallback() {
  return getSecret() === DEV_FALLBACK_SECRET;
}

function base64UrlEncode(buf) {
  return Buffer.from(buf).toString('base64url');
}

function base64UrlDecode(str) {
  return Buffer.from(str, 'base64url');
}

/**
 * @param {{ proposalId: string, slotId: string, customerId: string, exp: number }} payload
 */
export function signScheduleToken(payload) {
  const secret = getSecret();
  if (!secret) return null;

  const body = base64UrlEncode(JSON.stringify(payload));
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

/**
 * @param {string} token
 * @returns {{ ok: true, payload: object } | { ok: false, error: string }}
 */
export function verifyScheduleToken(token) {
  const secret = getSecret();
  if (!secret) return { ok: false, error: 'Token-Secret nicht konfiguriert' };
  if (!token || typeof token !== 'string') return { ok: false, error: 'Token fehlt' };

  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, error: 'Ungültiges Token-Format' };

  const [body, sig] = parts;
  const expected = createHmac('sha256', secret).update(body).digest('base64url');

  try {
    const a = Buffer.from(sig, 'base64url');
    const b = Buffer.from(expected, 'base64url');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, error: 'Ungültige Signatur' };
    }
  } catch {
    return { ok: false, error: 'Ungültige Signatur' };
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(body).toString('utf8'));
  } catch {
    return { ok: false, error: 'Token-Payload unlesbar' };
  }

  if (!payload.proposalId || !payload.slotId || !payload.customerId || !payload.exp) {
    return { ok: false, error: 'Token unvollständig' };
  }

  if (Date.now() > payload.exp) {
    return { ok: false, error: 'Link abgelaufen' };
  }

  return { ok: true, payload };
}

export function hasScheduleTokenConfig() {
  return Boolean(getSecret());
}

export function defaultTokenExpiryMs() {
  return DEFAULT_TTL_DAYS * 24 * 60 * 60 * 1000;
}

export function newProposalId() {
  return randomBytes(16).toString('hex');
}

export function newSlotId() {
  return randomBytes(6).toString('hex');
}
