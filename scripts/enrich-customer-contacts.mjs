#!/usr/bin/env node
/**
 * Contact enrichment – public sources only (company websites, respectful rate limits).
 * Updates customer-priorities.json with contactEmail, contactPhone, enrichmentSource, enrichedAt.
 *
 * Usage:
 *   node scripts/enrich-customer-contacts.mjs [--limit=N] [--dry-run]
 *   node scripts/enrich-customer-contacts.mjs --only-missing-email [--limit=200]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRIORITIES = path.join(__dirname, '../public/data/customer-priorities.json');
const DELAY_MS = 2500;
const USER_AGENT = 'PHT-Mastertool-ContactBot/1.0 (+https://pht-mastertool.local; respectful enrichment)';

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,6}/g;
const SKIP_EMAIL_DOMAINS = [
  'example.com', 'sentry.io', 'wixpress.com', 'schema.org', 'google.com',
  'facebook.com', 'twitter.com', 'instagram.com', 'youtube.com', 'linkedin.com',
  'cloudflare.com', 'w3.org', 'gravatar.com', 'wordpress.com',
];

/** Preferred office/info/QM prefixes – first match wins. */
const PREFERRED_PREFIXES = [
  'info', 'office', 'kontakt', 'contact', 'mail',
  'qm', 'quality', 'qualitaet', 'qualität',
  'vertrieb', 'sales', 'hello', 'anfrage', 'service',
];

const CONTACT_PATHS = [
  '/kontakt', '/contact', '/impressum', '/imprint',
  '/kontakt.html', '/contact.html', '/de/kontakt', '/de/contact',
  '/unternehmen/kontakt', '/about/contact',
];

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const onlyMissingEmail = args.includes('--only-missing-email');
const limitArg = args.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : (onlyMissingEmail ? 200 : 40);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function isValidEmail(email) {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  if (!domain || domain.length < 4) return false;
  return !SKIP_EMAIL_DOMAINS.some((d) => domain.includes(d));
}

function prefixScore(email) {
  const local = email.split('@')[0]?.toLowerCase() ?? '';
  const idx = PREFERRED_PREFIXES.findIndex((p) => local === p || local.startsWith(`${p}.`) || local.startsWith(`${p}-`));
  return idx >= 0 ? idx : 999;
}

function pickBestEmail(matches) {
  const filtered = [...new Set(matches.map((e) => e.toLowerCase()))].filter(isValidEmail);
  if (!filtered.length) return null;

  filtered.sort((a, b) => {
    const pa = prefixScore(a);
    const pb = prefixScore(b);
    if (pa !== pb) return pa - pb;
    return a.length - b.length;
  });
  return filtered[0];
}

function pickPhone(matches) {
  const cleaned = matches
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.replace(/\D/g, '').length >= 8);
  return cleaned[0] ?? null;
}

function guessWebsiteUrl(customer) {
  if (customer.researchUrl && /^https?:\/\//i.test(customer.researchUrl)) {
    return customer.researchUrl;
  }
  const slug = String(customer.name ?? '')
    .replace(/\s*-\s*(Plant|Werk|Standort|GmbH|AG).*$/i, '')
    .replace(/[^a-z0-9äöüß]/gi, '')
    .toLowerCase()
    .slice(0, 40);
  if (!slug || slug.length < 4) return null;

  const tlds = ['.at', '.com', '.de', '.eu'];
  return tlds.map((tld) => `https://www.${slug}${tld}`);
}

async function fetchPageText(url) {
  const res = await fetch(url, {
    headers: { Accept: 'text/html', 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(12000),
    redirect: 'follow',
  });
  if (!res.ok) return null;
  const html = await res.text();
  const decoded = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&');
  return decoded;
}

function buildUrlList(customer) {
  const urls = [];
  const guessed = guessWebsiteUrl(customer);
  const bases = Array.isArray(guessed) ? guessed : guessed ? [guessed] : [];

  for (const base of bases) {
    urls.push(base);
    const root = base.replace(/\/$/, '');
    for (const path of CONTACT_PATHS) {
      urls.push(`${root}${path}`);
    }
  }
  return [...new Set(urls)];
}

async function enrichCustomer(customer) {
  if (customer.contactEmail && !onlyMissingEmail) {
    return { skipped: true, reason: 'has-email' };
  }
  if (customer.contactEmail && customer.enrichedAt && !onlyMissingEmail) {
    return { skipped: true, reason: 'already-enriched' };
  }

  const urls = buildUrlList(customer);
  if (!urls.length) {
    return { skipped: true, reason: 'no-website-guess' };
  }

  let bestEmail = customer.contactEmail ?? null;
  let bestPhone = customer.contactPhone ?? null;
  let source = null;

  for (const url of urls) {
    try {
      const text = await fetchPageText(url);
      if (!text) continue;

      const emails = text.match(EMAIL_RE) ?? [];
      const email = pickBestEmail(emails);
      const phones = text.match(PHONE_RE) ?? [];
      const phone = pickPhone(phones);

      if (email && !bestEmail) {
        bestEmail = email;
        source = url;
      }
      if (phone && !bestPhone) bestPhone = phone;
      if (bestEmail) break;
    } catch {
      /* next URL */
    }
    await sleep(800);
  }

  if (bestEmail || (bestPhone && !customer.contactPhone)) {
    return {
      contactEmail: bestEmail ?? customer.contactEmail ?? null,
      contactPhone: bestPhone ?? customer.contactPhone ?? null,
      enrichmentSource: source ?? customer.enrichmentSource ?? null,
      enrichedAt: new Date().toISOString(),
    };
  }

  return { skipped: true, reason: 'no-contact-found' };
}

async function main() {
  console.log('=== Contact Enrichment (public sources) ===');
  const data = loadJson(PRIORITIES);
  const customers = Array.isArray(data.customers) ? data.customers : [];

  const candidates = onlyMissingEmail
    ? customers.filter((c) => !c.contactEmail)
    : customers.filter((c) => !c.contactEmail || !c.enrichedAt);

  const batch = candidates.slice(0, limit);
  console.log(
    `Mode: ${onlyMissingEmail ? 'only-missing-email' : 'default'} | `
    + `Candidates: ${candidates.length} | Processing: ${batch.length}${dryRun ? ' (dry-run)' : ''}`,
  );

  let enriched = 0;
  for (const customer of batch) {
    const result = await enrichCustomer(customer);
    if (result.skipped) {
      console.log(`  skip ${customer.name}: ${result.reason}`);
      await sleep(300);
      continue;
    }
    console.log(`  + ${customer.name}: ${result.contactEmail ?? '—'} (${result.enrichmentSource ?? '—'})`);
    if (!dryRun) {
      Object.assign(customer, result);
      enriched += 1;
    }
    await sleep(DELAY_MS);
  }

  if (!dryRun && enriched > 0) {
    data.lastContactEnrichment = new Date().toISOString();
    data.contactEnrichmentCount = (data.contactEnrichmentCount ?? 0) + enriched;
    fs.writeFileSync(PRIORITIES, JSON.stringify(data, null, 2), 'utf8');
  }

  console.log(`Enriched: ${enriched}${dryRun ? ' (dry-run, not saved)' : ''}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
