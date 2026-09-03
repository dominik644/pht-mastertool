function normalizeUrl(raw) {
  if (!raw) return null;
  return raw.trim().replace(/\/+$/, '').replace(/\/rest\/v1\/?$/i, '');
}

const url = normalizeUrl(process.env.SUPABASE_URL);
const key = process.env.SUPABASE_SERVICE_KEY;
const db = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

console.log('SUPABASE_URL:', url ? 'set' : 'missing');
console.log('SUPABASE_SERVICE_KEY:', key ? 'set' : 'missing');
console.log('SUPABASE_DB_URL:', db ? 'set' : 'missing');

if (!url || !key) {
  process.exit(1);
}

const res = await fetch(`${url}/rest/v1/app_users?select=email&limit=1`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
const text = await res.text();
console.log('HTTP', res.status);
console.log(text.slice(0, 300));
