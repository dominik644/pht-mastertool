/**
 * Business Central OData API v2.0 (server-side only).
 * Env: BC_TENANT_ID, BC_CLIENT_ID, BC_CLIENT_SECRET, BC_ENVIRONMENT, BC_COMPANY_ID
 */

const BC_SCOPE = 'https://api.businesscentral.dynamics.com/.default';

export function isBcConfigured() {
  return Boolean(
    process.env.BC_TENANT_ID &&
      process.env.BC_CLIENT_ID &&
      process.env.BC_CLIENT_SECRET &&
      process.env.BC_ENVIRONMENT &&
      process.env.BC_COMPANY_ID,
  );
}

export function getBcConfigStatus() {
  return {
    configured: isBcConfigured(),
    tenantId: Boolean(process.env.BC_TENANT_ID),
    clientId: Boolean(process.env.BC_CLIENT_ID),
    clientSecret: Boolean(process.env.BC_CLIENT_SECRET),
    environment: process.env.BC_ENVIRONMENT || null,
    companyId: process.env.BC_COMPANY_ID || null,
  };
}

async function getAccessToken() {
  const tenantId = process.env.BC_TENANT_ID;
  const clientId = process.env.BC_CLIENT_ID;
  const clientSecret = process.env.BC_CLIENT_SECRET;
  if (!tenantId || !clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: BC_SCOPE,
    grant_type: 'client_credentials',
  });

  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`BC Token-Fehler (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.access_token ?? null;
}

function companyBase() {
  const tenantId = process.env.BC_TENANT_ID;
  const environment = process.env.BC_ENVIRONMENT;
  const companyId = process.env.BC_COMPANY_ID;
  return `https://api.businesscentral.dynamics.com/v2.0/${tenantId}/${environment}/api/v2.0/companies(${companyId})`;
}

async function bcFetch(path, { method = 'GET', body } = {}) {
  const token = await getAccessToken();
  if (!token) throw new Error('BC-Zugangsdaten unvollständig oder Token nicht verfügbar');

  const url = `${companyBase()}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`BC API ${method} ${path} (${res.status}): ${text.slice(0, 300)}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

async function fetchAllPages(path) {
  const items = [];
  let next = path;
  let guard = 0;
  while (next && guard < 50) {
    guard += 1;
    const data = await bcFetch(next);
    if (Array.isArray(data?.value)) items.push(...data.value);
    next = data?.['@odata.nextLink']
      ? data['@odata.nextLink'].replace(companyBase(), '')
      : null;
  }
  return items;
}

function mapAddress(entity) {
  const street = [entity.addressLine1, entity.addressLine2].filter(Boolean).join(', ');
  return {
    street: street || '',
    plz: entity.postalCode ?? '',
    ort: entity.city ?? '',
    land: entity.country ?? entity.countryRegionCode ?? '',
  };
}

function mapContact(entity) {
  return {
    name: entity.displayName ?? entity.name ?? '',
    email: entity.email ?? entity.eMail ?? '',
    phone: entity.phoneNumber ?? entity.mobilePhone ?? '',
    role: entity.jobTitle ?? entity.type ?? '',
  };
}

/**
 * @param {Array<{ id: string, customerNumber?: string|null, name: string, notes?: string }>} localCustomers
 */
export async function syncFromBusinessCentral(localCustomers = []) {
  const syncedAt = new Date().toISOString();
  const [customers, contacts, shipTos] = await Promise.all([
    fetchAllPages('/customers?$select=id,number,displayName,addressLine1,addressLine2,city,postalCode,country,phoneNumber,email'),
    fetchAllPages('/contacts?$select=id,displayName,email,phoneNumber,mobilePhone,jobTitle,type,companyNumber,companyName').catch(() => []),
    fetchAllPages('/shipToAddresses?$select=id,customerId,customerNumber,code,name,address,address2,city,postCode,countryRegionCode').catch(() => []),
  ]);

  const contactsByCompany = new Map();
  for (const c of contacts) {
    const key = c.companyNumber ?? c.companyName ?? '';
    if (!key) continue;
    if (!contactsByCompany.has(key)) contactsByCompany.set(key, []);
    contactsByCompany.get(key).push(c);
  }

  const shipToByCustomer = new Map();
  for (const s of shipTos) {
    const key = s.customerNumber ?? s.customerId ?? '';
    if (!key) continue;
    if (!shipToByCustomer.has(key)) shipToByCustomer.set(key, []);
    shipToByCustomer.get(key).push(s);
  }

  const bcByNumber = new Map(customers.map((c) => [String(c.number), c]));
  const bcByName = new Map(customers.map((c) => [normalizeName(c.displayName), c]));

  const matches = [];
  const unmatchedLocal = [];

  for (const local of localCustomers) {
    const bc = (local.customerNumber && bcByNumber.get(String(local.customerNumber)))
      || bcByName.get(normalizeName(local.name));
    if (!bc) {
      unmatchedLocal.push({ id: local.id, name: local.name, customerNumber: local.customerNumber });
      continue;
    }

    const numberKey = String(bc.number);
    const contactList = contactsByCompany.get(numberKey) ?? contactsByCompany.get(bc.displayName) ?? [];
    const primaryContact = contactList[0];
    const shipList = shipToByCustomer.get(numberKey) ?? shipToByCustomer.get(bc.id) ?? [];
    const primaryShip = shipList[0];

    const rechnungsadresse = mapAddress(bc);
    const lieferadresse = primaryShip
      ? {
          street: [primaryShip.address, primaryShip.address2].filter(Boolean).join(', '),
          plz: primaryShip.postCode ?? '',
          ort: primaryShip.city ?? '',
          land: primaryShip.countryRegionCode ?? '',
        }
      : { ...rechnungsadresse };

    const related = contactList.slice(1).map((c) => ({
      companyName: c.companyName ?? c.displayName ?? '',
      relationType: c.jobTitle ?? 'Kontakt',
      bcCustomerNo: c.companyNumber ?? undefined,
    }));

    matches.push({
      localCustomerId: local.id,
      bcCustomerNumber: numberKey,
      details: {
        ansprechperson: primaryContact ? mapContact(primaryContact) : undefined,
        rechnungsadresse,
        lieferadresse,
        lieferadresseWieRechnung: !primaryShip,
        zugehoerigeFirmen: related.length ? related : undefined,
        bcCustomerId: bc.id,
        bcCustomerNumber: numberKey,
        bcLastSync: syncedAt,
      },
    });
  }

  // BC OData v2.0 hat kein Standard-Notizfeld auf customers – Besuchsnotizen bleiben lokal.
  const notesCandidates = localCustomers.filter((c) => c.notes?.trim()).length;

  return {
    configured: true,
    syncedAt,
    bcCustomerCount: customers.length,
    matches,
    unmatchedLocal,
    unmatchedBcCount: customers.length - new Set(matches.map((m) => m.bcCustomerNumber)).size,
    notesPushed: 0,
    notesPushSupported: false,
    notesCandidates,
    notesHint: 'Besuchsnotizen können über die Standard-BC-API nicht zurückgeschrieben werden. Stammdaten-Sync ist BC → App.',
  };
}

function normalizeName(name) {
  return String(name ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}
