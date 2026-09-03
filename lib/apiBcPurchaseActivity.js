import {
  daysSinceIsoDate,
  fetchLastInvoiceDateByCustomer,
  isBcConfigured,
} from './businessCentralApi.js';

/**
 * READ ONLY – Kaufaktivität (letzte Rechnung) für lokale Kunden mit BC-Nummer.
 * POST body: { mappings: [{ localCustomerId, bcCustomerNumber }] }
 */
export default async function apiBcPurchaseActivityHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isBcConfigured()) {
    return res.status(503).json({
      configured: false,
      error: 'BC nicht konfiguriert',
      setupRequired: true,
    });
  }

  const mappings = Array.isArray(req.body?.mappings) ? req.body.mappings : [];
  if (mappings.length === 0) {
    return res.status(400).json({ error: 'mappings Array erforderlich' });
  }

  try {
    const index = await fetchLastInvoiceDateByCustomer();
    const checkedAt = new Date().toISOString();
    const items = mappings
      .map((m) => {
        const localCustomerId = String(m?.localCustomerId ?? '').trim();
        const bcCustomerNumber = String(m?.bcCustomerNumber ?? '').trim();
        if (!localCustomerId || !bcCustomerNumber) return null;
        const last = index.get(bcCustomerNumber) ?? null;
        return {
          localCustomerId,
          bcCustomerNumber,
          bcLastInvoiceDate: last,
          bcDaysSincePurchase: last ? daysSinceIsoDate(last) : null,
          bcPurchaseCheckedAt: checkedAt,
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      configured: true,
      readOnly: true,
      items,
      fetchedAt: checkedAt,
    });
  } catch (err) {
    return res.status(500).json({
      configured: true,
      error: err instanceof Error ? err.message : 'Unbekannter Fehler',
    });
  }
}
