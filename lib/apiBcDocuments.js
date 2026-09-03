import {
  fetchBcDocumentsByCustomer,
  isBcConfigured,
} from './businessCentralApi.js';

/**
 * READ ONLY – KV (Angebote), Rechnungen und Konditionsvereinbarungen aus Business Central.
 */
export default async function apiBcDocumentsHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      hint: 'BC-Dokumente sind READ-ONLY – nur GET erlaubt.',
    });
  }

  if (!isBcConfigured()) {
    return res.status(503).json({
      configured: false,
      error: 'BC nicht konfiguriert',
      setupRequired: true,
    });
  }

  const customerNo = req.query?.customerNo ?? req.query?.customerNumber;
  const type = req.query?.type ?? 'quote';

  if (!customerNo) {
    return res.status(400).json({ error: 'customerNo Query-Parameter erforderlich' });
  }

  if (type !== 'quote' && type !== 'invoice' && type !== 'conditionAgreement') {
    return res.status(400).json({ error: 'type muss quote, invoice oder conditionAgreement sein' });
  }

  try {
    const result = await fetchBcDocumentsByCustomer(String(customerNo), type);
    return res.status(200).json({
      configured: true,
      readOnly: true,
      customerNo: String(customerNo),
      ...result,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      configured: true,
      readOnly: true,
      error: err instanceof Error ? err.message : 'Unbekannter Fehler',
    });
  }
}
