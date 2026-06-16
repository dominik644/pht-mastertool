/**
 * Spain PCSP – CODICE/Atom entry parsing (sindicación 643)
 */

import { matchesPHTText } from './ocdsMapper.js';
import { inferIndustry } from './utils.js';

function decodeEntities(text) {
  return String(text || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&nbsp;/g, ' ');
}

function firstTagFull(block, tag) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`);
  const m = block.match(re);
  return m ? decodeEntities(m[1].trim()) : '';
}

function allTags(block, tag) {
  const re = new RegExp(`<${tag}[^>]*>([^<]+)<\\/${tag}>`, 'g');
  const out = [];
  let m;
  while ((m = re.exec(block)) !== null) out.push(m[1].trim());
  return out;
}

function linkHref(block) {
  return (block.match(/<link href="([^"]+)"/) || [])[1]?.replace(/&amp;/g, '&').trim() || '';
}

function syndicationId(block) {
  const raw = firstTagFull(block, 'id');
  const m = raw.match(/\/(\d+)\s*$/);
  return m ? m[1] : raw.replace(/[^a-zA-Z0-9]+/g, '-').slice(-24);
}

function parseAmount(block) {
  const m = block.match(
    /<cbc:EstimatedOverallContractAmount[^>]*>([^<]+)<\/cbc:EstimatedOverallContractAmount>/,
  );
  if (m) return Math.round(parseFloat(m[1]) || 0);
  const m2 = block.match(/<cbc:TotalAmount[^>]*>([^<]+)<\/cbc:TotalAmount>/);
  return m2 ? Math.round(parseFloat(m2[1]) || 0) : 0;
}

function parseDeadline(block) {
  const m = block.match(/<cac:TenderSubmissionDeadlinePeriod>[\s\S]*?<cbc:EndDate>([^<]+)<\/cbc:EndDate>/);
  if (m) return m[1].trim().slice(0, 10);
  const summary = firstTagFull(block, 'summary');
  const sm = summary.match(/Fecha fin[^:]*:\s*(\d{4}-\d{2}-\d{2})/i);
  return sm ? sm[1] : '';
}

function parseBuyer(block) {
  const m = block.match(
    /<cac-place-ext:LocatedContractingParty>[\s\S]*?<cac:PartyName>[\s\S]*?<cbc:Name>([^<]+)<\/cbc:Name>/,
  );
  if (m) return decodeEntities(m[1].trim());
  const summary = firstTagFull(block, 'summary');
  const sm = summary.match(/Órgano de Contratación:\s*([^;]+)/i);
  return sm ? sm[1].trim() : '';
}

function parseStatus(block) {
  const m = block.match(/<cbc-place-ext:ContractFolderStatusCode[^>]*>([^<]+)<\/cbc-place-ext:ContractFolderStatusCode>/);
  return m ? m[1].trim() : '';
}

export function parsePcspAtomEntries(xml) {
  const entries = [];
  const chunks = String(xml).split('<entry>');
  for (let i = 1; i < chunks.length; i++) {
    const block = chunks[i].split('</entry>')[0];
    const title = firstTagFull(block, 'title');
    if (!title) continue;
    entries.push({
      block,
      id: syndicationId(block),
      title,
      link: linkHref(block),
      summary: firstTagFull(block, 'summary'),
      updated: firstTagFull(block, 'updated'),
      buyer: parseBuyer(block),
      budget: parseAmount(block),
      cpvCodes: allTags(block, 'cbc:ItemClassificationCode'),
      status: parseStatus(block),
      deadline: parseDeadline(block),
      contractId: firstTagFull(block, 'cbc:ContractFolderID'),
    });
  }
  return entries;
}

export function mapPcspEntry(entry) {
  const pubDate = entry.updated ? new Date(entry.updated).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const deadline =
    entry.deadline || new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
  const desc = `${entry.title}. Órgano: ${entry.buyer}. ${entry.summary}`.slice(0, 800);

  return {
    id: `pcsp-es-${entry.id}`,
    title: entry.title.slice(0, 300),
    country: 'Spanien',
    countryCode: 'ESP',
    region: 'Europa',
    budget: entry.budget || 50000,
    currency: 'EUR',
    sourcePlatform: 'PCSP',
    sourceUrl: entry.link || `https://contrataciondelestado.es/sindicacion/licitacionesPerfilContratante/${entry.id}`,
    publicationDate: pubDate,
    submissionDeadline: deadline,
    description: desc,
    industry: inferIndustry(`${entry.title} ${desc}`),
    cpvCodes: entry.cpvCodes,
    status: entry.status || undefined,
    contractId: entry.contractId || undefined,
  };
}

export function entryMatchesPHT(entry) {
  return matchesPHTText(`${entry.title} ${entry.summary}`, entry.cpvCodes);
}
