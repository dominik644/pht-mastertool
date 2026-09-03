#!/usr/bin/env node
/**
 * Contact enrichment – public sources only (company websites, respectful rate limits).
 * Updates customer-priorities.json with contactEmail, contactPhone, enrichmentSource, enrichedAt.
 *
 * Usage: node scripts/enrich-customer-contacts.mjs [--limit=N] [--dry-run]
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
const SKIP_EMAIL_DOMAINS = ['example.com', 'sentry.io', 'wixpress.com', 'schema.org', 'google.com', 'facebook.com'];

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitArg = args.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : 40;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function pickBestEmail(matches) {
  const filtered = matches.filter((e) => {
    const domain = e.split('@')[1]?.toLowerCase() ?? '';
    return !SKIP_EMAIL_DOMAINS.some((d) => domain.includes(d));
  });
  const info = filtered.find((e) => /^(info|office|kontakt|contact|sales|vertrieb|hello)@/i.test(e));
  return info ?? filtered[0] ?? null;
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
    .replace(/\s*-\s*(Plant|Werk|Standort).*$/i, '')
    .replace(/[^a-z0-9äöüß]/gi, '')
    .toLowerCase()
    .slice(0, 40);
  if (!slug || slug.length < 4) return null;
  return `https://www.${slug}.com`;
}

async function fetchPageText(url) {
  const res = await fetch(url, {
    headers: { Accept: 'text/html', 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(12000),
    redirect: 'follow',
  });
  if (!res.ok) return null;
  const html = await res.text();
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ');
}

async function enrichCustomer(customer) {
  if (customer.contactEmail && customer.enrichedAt) {
    return { skipped: true, reason: 'already-enriched' };
  }

  const urls = [];
  const primary = guessWebsiteUrl(customer);
  if (primary) urls.push(primary);
  if (primary && !primary.includes('/contact') && !primary.includes('/impressum')) {
    const base = primary.replace(/\/$/, '');
    urls.push(`${base}/kontakt`, `${base}/contact`, `${base}/impressum`, `${base}/imprint`);
  }

  for (const url of urls) {
    try {
      const text = await fetchPageText(url);
      if (!text) continue;
      const emails = [...new Set(text.match(EMAIL_RE) ?? [])].map((e) => e.toLowerCase());
      const email = pickBestEmail(emails);
      const phones = text.match(PHONE_RE) ?? [];
      const phone = pickPhone(phones);
      if (email || phone) {
        return {
          contactEmail: email ?? customer.contactEmail ?? null,
          contactPhone: phone ?? customer.contactPhone ?? null,
          enrichmentSource: url,
          enrichedAt: new Date().toISOString(),
        };
      }
    } catch {
      /* next URL */
    }
    await sleep(800);
  }

  return { skipped: true, reason: 'no-contact-found' };
}

async function main() {
  console.log('=== Contact Enrichment (public sources) ===');
  const data = loadJson(PRIORITIES);
  const customers = Array.isArray(data.customers) ? data.customers : [];

  const candidates = customers.filter((c) => !c.contactEmail || !c.enrichedAt);
  const batch = candidates.slice(0, limit);
  console.log(`Candidates: ${candidates.length} | Processing: ${batch.length}${dryRun ? ' (dry-run)' : ''}`);

  let enriched = 0;
  for (const customer of batch) {
    const result = await enrichCustomer(customer);
    if (result.skipped) {
      console.log(`  skip ${customer.name}: ${result.reason}`);
      await sleep(300);
      continue;
    }
    console.log(`  + ${customer.name}: ${result.contactEmail ?? '—'} (${result.enrichmentSource})`);
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
