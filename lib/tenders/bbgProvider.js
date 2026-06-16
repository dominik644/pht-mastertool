/**
 * BBG Österreich – HTML-Parser für aktuelle Ausschreibungen
 * https://www.bbg.gv.at/information/aktuelle-ausschreibungen
 */

import { inferIndustry, matchesPHT, parseIsoDate } from './utils.js';

const API_PROXY = '/api/tenders/bbg';
const API_DIRECT = 'https://www.bbg.gv.at/information/aktuelle-ausschreibungen';
const LIST_URL = 'https://www.bbg.gv.at/information/aktuelle-ausschreibungen';

function getUrl() {
  return typeof window !== 'undefined' ? API_PROXY : API_DIRECT;
}

function decodeHtml(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseModalBodies(html) {
  const modals = new Map();
  const re = /id="exampleModal(\d+)"[\s\S]*?<div class="modal-body">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/gi;
  for (const match of html.matchAll(re)) {
    const body = decodeHtml(match[2].replace(/<[^>]+>/g, ' '));
    if (body) modals.set(match[1], body);
  }
  return modals;
}

function parseRows(html) {
  const rows = [];
  const re = /<tr[^>]*data-timestamp="[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  for (const match of html.matchAll(re)) {
    const row = match[1];
    if (!row.includes('description-search')) continue;

    const title = decodeHtml(
      row.match(/class="description-search">\s*([\s\S]*?)\s*<\/span>/)?.[1] || '',
    );
    if (!title || title.length < 4) continue;

    rows.push({
      title,
      number: decodeHtml(row.match(/class="minify number">([^<]+)</)?.[1] || ''),
      family: decodeHtml(row.match(/class="minify productfamily">([^<]+)</)?.[1] || ''),
      publicationDate: row.match(/class="release-search" data-attribute="([^"]+)"/)?.[1] || '',
      submissionDeadline: row.match(/class="deadline-search" data-attribute="([^"]+)"/)?.[1] || '',
      modalId: row.match(/data-target="#exampleModal(\d+)"/)?.[1] || '',
    });
  }
  return rows;
}

function mapRow(row, modalText) {
  const numberKey = row.number.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  const id = `bbg-${numberKey || row.modalId || row.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`;
  const description = [
    `BBG Ausschreibung: ${row.title}.`,
    row.family ? `Warengruppe: ${row.family}.` : '',
    row.number ? `Vergabenummer: ${row.number}.` : '',
    modalText || 'Details und Unterlagen über ANKÖ-Vergabeportal.',
  ].filter(Boolean).join(' ').slice(0, 800);

  const tender = {
    id,
    title: row.title.slice(0, 300),
    country: 'Österreich',
    countryCode: 'AUT',
    region: 'DACH',
    budget: 150000,
    currency: 'EUR',
    sourcePlatform: 'BBG',
    sourceUrl: LIST_URL,
    publicationDate: parseIsoDate(row.publicationDate),
    submissionDeadline: parseIsoDate(row.submissionDeadline),
    description,
    industry: inferIndustry(`${row.title} ${row.family} ${modalText || ''}`),
    cpvCodes: [],
  };

  return matchesPHT(tender) ? tender : null;
}

export async function fetchBBGTenders() {
  const res = await fetch(getUrl(), {
    headers: { 'User-Agent': 'PHT-Mastertool/1.0', Accept: 'text/html' },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`BBG ${res.status}`);
  const html = await res.text();
  const modals = parseModalBodies(html);
  const tenders = parseRows(html)
    .map((row) => mapRow(row, modals.get(row.modalId)))
    .filter(Boolean);
  return { tenders, source: 'bbg', live: tenders.length > 0 };
}
