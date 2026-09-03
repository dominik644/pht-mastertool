import { buildProposalEml } from './buildProposalEml.js';

function safeFilename(subject) {
  return String(subject).replace(/[^\wäöüÄÖÜß\- ]+/g, '').slice(0, 60).trim() || 'PHT-Terminvorschlag';
}

function parseBody(req) {
  const body = req.body ?? {};
  let attachments = [];
  if (typeof body.attachments === 'string') {
    try {
      attachments = JSON.parse(body.attachments);
    } catch {
      attachments = [];
    }
  } else if (Array.isArray(body.attachments)) {
    attachments = body.attachments;
  }
  return {
    to: String(body.to ?? '').trim(),
    subject: String(body.subject ?? '').trim(),
    html: String(body.html ?? ''),
    text: String(body.text ?? ''),
    attachments,
  };
}

/**
 * POST /api/schedule-eml
 * Returns inline .eml so Windows can open Outlook with To: pre-filled.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { to, subject, html, text, attachments } = parseBody(req);
  if (!to || !subject || !html) return res.status(400).end();

  const eml = buildProposalEml({ to, subject, html, text, attachments });
  const filename = safeFilename(subject);

  res.setHeader('Content-Type', 'application/vnd.ms-outlook; charset=UTF-8');
  res.setHeader('Content-Disposition', `inline; filename="${filename}.eml"`);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(eml);
}
