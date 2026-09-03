/**
 * Business Central OData API v2.0 (server-side only).
 * Env: BC_TENANT_ID, BC_CLIENT_ID, BC_CLIENT_SECRET, BC_ENVIRONMENT, BC_COMPANY_ID
 *
 * SECURITY: READ-ONLY – nur GET-Anfragen. Kein POST/PATCH/DELETE zu Production-ERP.
 * Azure App: bevorzugt BC_READ_ONLY Scope (API.Read) statt API.ReadWrite.All.
 */

const BC_SCOPE = 'https://api.businesscentral.dynamics.com/.default';

/** Nur GET – jede Schreiboperation wird blockiert. */
const BC_READ_ONLY = true;

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

function bcApiRoot() {
  const tenantId = process.env.BC_TENANT_ID;
  const environment = process.env.BC_ENVIRONMENT;
  return `https://api.businesscentral.dynamics.com/v2.0/${tenantId}/${environment}`;
}

function companyBase() {
  const companyId = process.env.BC_COMPANY_ID;
  return `${bcApiRoot()}/api/v2.0/companies(${companyId})`;
}

/** Custom-API-Basis für PHT-Erweiterungen (Konditionsvereinbarungen o. ä.). */
function conditionAgreementsBase() {
  const publisher = process.env.BC_CUSTOM_API_PUBLISHER;
  const group = process.env.BC_CUSTOM_API_GROUP;
  if (publisher && group) {
    const version = process.env.BC_CUSTOM_API_VERSION || 'v1.0';
    const companyId = process.env.BC_COMPANY_ID;
    return `${bcApiRoot()}/api/${publisher}/${group}/${version}/companies(${companyId})`;
  }
  return companyBase();
}

function getConditionAgreementsEntitySet() {
  return process.env.BC_CONDITION_AGREEMENTS_ENTITY || 'konditionsvereinbarungen';
}

/** BC-Webclient-URL (optional BC_COMPANY_NAME + BC_CONDITION_AGREEMENTS_PAGE_ID). */
export function getBcWebUrlForDocument(number, { pageId } = {}) {
  const tenantId = process.env.BC_TENANT_ID;
  const environment = process.env.BC_ENVIRONMENT;
  const companyName = process.env.BC_COMPANY_NAME;
  if (!tenantId || !environment || !companyName) return null;
  const page = pageId ?? process.env.BC_CONDITION_AGREEMENTS_PAGE_ID;
  const base = `https://businesscentral.dynamics.com/${tenantId}/${environment}?company=${encodeURIComponent(companyName)}`;
  if (!page || !number) return base;
  const filter = `'No.' IS '${String(number).replace(/'/g, "''")}'`;
  return `${base}&page=${page}&filter=${encodeURIComponent(filter)}`;
}

async function bcFetch(path, { method = 'GET', body, base = companyBase() } = {}) {
  if (BC_READ_ONLY && method !== 'GET') {
    throw new Error(
      `BC READ-ONLY: ${method} ist blockiert. Keine Schreibzugriffe auf Production-ERP.`,
    );
  }
  const token = await getAccessToken();
  if (!token) throw new Error('BC-Zugangsdaten unvollständig oder Token nicht verfügbar');

  const url = `${base}${path}`;
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

/** OData-Paginierung bis @odata.nextLink ausläuft – kein Seitenlimit. */
async function fetchAllPages(path, { base = companyBase() } = {}) {
  const items = [];
  let next = path;
  while (next) {
    const data = await bcFetch(next, { base });
    if (Array.isArray(data?.value)) items.push(...data.value);
    next = data?.['@odata.nextLink']
      ? data['@odata.nextLink'].replace(base, '')
      : null;
  }
  return items;
}

function mapConditionAgreement(entity) {
  const startDate =
    entity.startingDate ?? entity.validFrom ?? entity.documentDate ?? entity.orderDate ?? entity.startDate;
  const endDate = entity.endingDate ?? entity.validTo ?? entity.dueDate ?? entity.endDate;
  const number = entity.number ?? entity.no ?? entity.documentNumber ?? '';
  return {
    id: entity.id ?? entity.systemId,
    number,
    customerNumber: entity.customerNumber ?? entity.customerNo ?? entity.sellToCustomerNo,
    description: entity.description ?? entity.displayName ?? entity.name ?? '',
    startDate: startDate ? String(startDate).slice(0, 10) : undefined,
    endDate: endDate ? String(endDate).slice(0, 10) : undefined,
    status: entity.status ?? entity.state ?? entity.documentStatus ?? '',
    bcUrl: getBcWebUrlForDocument(number),
  };
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
  const [customers, contacts, shipTos, salespeople] = await Promise.all([
    fetchCustomersForSync(),
    fetchAllPages('/contacts?$select=id,displayName,email,phoneNumber,mobilePhone,jobTitle,type,companyNumber,companyName').catch(() => []),
    fetchAllPages('/shipToAddresses?$select=id,customerId,customerNumber,code,name,address,address2,city,postCode,countryRegionCode').catch(() => []),
    fetchSalespeoplePurchasers().catch(() => []),
  ]);

  const salespersonByCode = new Map(
    salespeople.map((sp) => [sp.code.toUpperCase(), sp]),
  );

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

    const spCode = String(bc.salespersonCode ?? '').trim();
    const sp = spCode ? salespersonByCode.get(spCode.toUpperCase()) : undefined;
    const customerEmail = String(bc.email ?? '').trim();
    const customerPhone = String(bc.phoneNumber ?? '').trim();
    const contactFromBc = primaryContact ? mapContact(primaryContact) : undefined;
    const ansprechperson = {
      name: contactFromBc?.name || '',
      email: contactFromBc?.email || customerEmail,
      phone: contactFromBc?.phone || customerPhone,
      role: contactFromBc?.role || '',
    };

    matches.push({
      localCustomerId: local.id,
      bcCustomerNumber: numberKey,
      overlay: {
        contactEmail: ansprechperson.email || undefined,
        contactPhone: ansprechperson.phone || undefined,
        salesRep: sp?.name || undefined,
        bcSalespersonCode: spCode || undefined,
      },
      details: {
        ansprechperson: ansprechperson.name || ansprechperson.email || ansprechperson.phone
          ? ansprechperson
          : undefined,
        rechnungsadresse,
        lieferadresse,
        lieferadresseWieRechnung: !primaryShip,
        zugehoerigeFirmen: related.length ? related : undefined,
        bcCustomerId: bc.id,
        bcCustomerNumber: numberKey,
        bcLastSync: syncedAt,
        bcSalespersonCode: spCode || undefined,
        bcSalespersonName: sp?.name || undefined,
        bcBlocked: parseBcBlocked(bc.blocked),
        bcPaymentTerms: String(bc.paymentTermsCode ?? '').trim() || undefined,
        bcCounty: String(bc.county ?? '').trim() || undefined,
      },
    });
  }

  // BC OData v2.0 hat kein Standard-Notizfeld auf customers – Besuchsnotizen bleiben lokal.
  const notesCandidates = localCustomers.filter((c) => c.notes?.trim()).length;

  let salesTeam = null;
  try {
    salesTeam = await fetchSalesTeamOverview();
  } catch {
    salesTeam = { salespeople: [], gebietsCustomAvailable: false };
  }

  let invoiceIndex = new Map();
  try {
    invoiceIndex = await fetchLastInvoiceDateByCustomer();
  } catch {
    invoiceIndex = new Map();
  }

  for (const match of matches) {
    const last = invoiceIndex.get(match.bcCustomerNumber);
    if (last) {
      match.details.bcLastInvoiceDate = last;
      match.details.bcDaysSincePurchase = daysSinceIsoDate(last);
      match.details.bcPurchaseCheckedAt = syncedAt;
    }
  }

  return {
    configured: true,
    syncedAt,
    bcCustomerCount: customers.length,
    matches,
    unmatchedLocal,
    unmatchedBcCount: customers.length - new Set(matches.map((m) => m.bcCustomerNumber)).size,
    salesTeam: {
      salespeople: salesTeam.salespeople ?? [],
      gebietsCustomAvailable: salesTeam.gebietsCustomAvailable ?? false,
    },
    notesPushed: 0,
    notesPushSupported: false,
    notesCandidates,
    notesHint: 'Besuchsnotizen können über die Standard-BC-API nicht zurückgeschrieben werden. Stammdaten-Sync ist BC → App.',
  };
}

/** @param {unknown} blocked */
function parseBcBlocked(blocked) {
  const v = String(blocked ?? '').trim();
  if (!v || v === ' ') return false;
  return true;
}

function normalizeName(name) {
  return String(name ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Customers for stammdaten sync – extended fields optional (BC version dependent). */
async function fetchCustomersForSync() {
  const extended =
    '/customers?$select=id,number,displayName,addressLine1,addressLine2,city,postalCode,country,phoneNumber,email,salespersonCode,blocked,paymentTermsCode,county';
  const basic =
    '/customers?$select=id,number,displayName,addressLine1,addressLine2,city,postalCode,country,phoneNumber,email,salespersonCode,blocked';
  try {
    return await fetchAllPages(extended);
  } catch {
    return fetchAllPages(basic);
  }
}

/**
 * READ ONLY – Verkaufsangebote (KV) für Kundennummer.
 * @param {string} customerNo
 */
export async function fetchSalesQuotesByCustomer(customerNo) {
  const no = encodeURIComponent(String(customerNo).trim());
  const path = `/salesQuotes?$filter=customerNumber eq '${no}'&$select=id,number,customerNumber,customerName,orderDate,dueDate,totalAmountIncludingTax,currencyCode,status&$orderby=orderDate desc&$top=1000`;
  return fetchAllPages(path);
}

/**
 * READ ONLY – Letzte Rechnungsdaten je Kundennummer (Batch über alle salesInvoices).
 * @returns {Promise<Map<string, string>>} customerNumber → invoiceDate (YYYY-MM-DD)
 */
export async function fetchLastInvoiceDateByCustomer() {
  const raw = await fetchAllPages(
    '/salesInvoices?$select=customerNumber,invoiceDate&$orderby=invoiceDate desc&$top=1000',
  );
  const index = new Map();
  for (const inv of raw) {
    const no = String(inv.customerNumber ?? '').trim();
    const date = inv.invoiceDate ? String(inv.invoiceDate).slice(0, 10) : '';
    if (!no || !date) continue;
    const existing = index.get(no);
    if (!existing || date > existing) index.set(no, date);
  }
  return index;
}

export function daysSinceIsoDate(isoDate) {
  const then = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(then.getTime())) return null;
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / (24 * 60 * 60 * 1000)));
}

/**
 * READ ONLY – Verkaufsrechnungen für Kundennummer.
 * @param {string} customerNo
 */
export async function fetchSalesInvoicesByCustomer(customerNo) {
  const no = encodeURIComponent(String(customerNo).trim());
  const path = `/salesInvoices?$filter=customerNumber eq '${no}'&$select=id,number,customerNumber,customerName,invoiceDate,dueDate,totalAmountIncludingTax,currencyCode,status&$orderby=invoiceDate desc&$top=1000`;
  return fetchAllPages(path);
}

/**
 * READ ONLY – Konditionsvereinbarungen für Kundennummer.
 * Standard v2.0 hat kein natives Entity – PHT-BC-Erweiterung exponiert typischerweise
 * `konditionsvereinbarungen` (überschreibbar via BC_CONDITION_AGREEMENTS_ENTITY).
 * Custom-API: BC_CUSTOM_API_PUBLISHER + BC_CUSTOM_API_GROUP (+ optional VERSION).
 * @param {string} customerNo
 */
export async function fetchConditionAgreementsByCustomer(customerNo) {
  const no = encodeURIComponent(String(customerNo).trim());
  const entitySet = getConditionAgreementsEntitySet();
  const base = conditionAgreementsBase();
  const path = `/${entitySet}?$filter=customerNumber eq '${no}'&$top=1000`;
  try {
    const raw = await fetchAllPages(path, { base });
    const documents = raw.map(mapConditionAgreement).sort((a, b) => {
      const da = a.startDate ?? '';
      const db = b.startDate ?? '';
      return db.localeCompare(da);
    });
    return { entitySet, apiBase: base.includes('/api/v2.0/') ? 'v2.0' : 'custom', documents, supported: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/\b404\b|NotFound|Resource not found|No HTTP resource/i.test(msg)) {
      return {
        entitySet,
        apiBase: base.includes('/api/v2.0/') ? 'v2.0' : 'custom',
        documents: [],
        supported: false,
        hint:
          'Konditionsvereinbarungen-Entity nicht gefunden. IT: BC-API-Page publizieren (EntitySet „konditionsvereinbarungen“) oder BC_CONDITION_AGREEMENTS_ENTITY / BC_CUSTOM_API_* setzen.',
      };
    }
    throw err;
  }
}

function getGebietsaufteilungEntitySet() {
  return process.env.BC_GEBIETSAUFTEILUNG_ENTITY || 'gebietsaufteilungen';
}

/** @param {unknown} raw */
function parseBundeslaenderList(raw) {
  if (Array.isArray(raw)) {
    return raw.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(/[,;|/]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/** @param {Record<string, unknown>} entity */
function mapGebietsaufteilungEntry(entity) {
  const code = String(
    entity.salespersonCode ?? entity.verkaeuferCode ?? entity.salesPersonCode ?? entity.code ?? '',
  ).trim();
  if (!code) return null;
  const blRaw = entity.bundeslaender ?? entity.bundesland ?? entity.region ?? entity.gebiet ?? entity.territory ?? '';
  return {
    salespersonCode: code,
    bundeslaender: parseBundeslaenderList(blRaw),
  };
}

/**
 * READ ONLY – Verkäufer/Einkäufer aus BC.
 * @returns {Promise<Array<{ code: string, name: string, email: string, blocked: boolean }>>}
 */
export async function fetchSalespeoplePurchasers() {
  const raw = await fetchAllPages(
    '/salespeoplePurchasers?$select=code,displayName,email,blocked,privacyBlocked&$top=1000',
  );
  return raw
    .map((sp) => ({
      code: String(sp.code ?? '').trim(),
      name: String(sp.displayName ?? sp.code ?? '').trim(),
      email: String(sp.email ?? '').trim(),
      blocked: Boolean(sp.blocked || sp.privacyBlocked),
    }))
    .filter((sp) => sp.code && !sp.blocked)
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

/**
 * READ ONLY – Kunden mit Verkäufer-Zuordnung (salespersonCode).
 * @returns {Promise<Array<{ number: string, name: string, salespersonCode: string, postalCode: string, country: string, city: string }>>}
 */
export async function fetchCustomersWithSalesperson() {
  const raw = await fetchAllPages(
    '/customers?$select=number,displayName,salespersonCode,postalCode,country,city&$top=1000',
  );
  return raw
    .map((c) => ({
      number: String(c.number ?? '').trim(),
      name: String(c.displayName ?? '').trim(),
      salespersonCode: String(c.salespersonCode ?? '').trim(),
      postalCode: String(c.postalCode ?? '').trim(),
      country: String(c.country ?? '').trim(),
      city: String(c.city ?? '').trim(),
    }))
    .filter((c) => c.number);
}

/**
 * READ ONLY – Gebietsaufteilung pro Verkäufer (PHT Custom-API, optional).
 * Env: BC_GEBIETSAUFTEILUNG_ENTITY (Default: gebietsaufteilungen)
 */
export async function fetchGebietsaufteilung() {
  const entitySet = getGebietsaufteilungEntitySet();
  const base = conditionAgreementsBase();
  try {
    const raw = await fetchAllPages(`/${entitySet}?$top=1000`, { base });
    return raw.map(mapGebietsaufteilungEntry).filter(Boolean);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/\b404\b|NotFound|Resource not found|No HTTP resource/i.test(msg)) {
      return [];
    }
    throw err;
  }
}

/**
 * READ ONLY – Verkäufer mit Kunden-Zuordnung und Gebiet (BC + abgeleitet).
 */
export async function fetchSalesTeamOverview() {
  const [salespeople, customers, gebietsRows] = await Promise.all([
    fetchSalespeoplePurchasers(),
    fetchCustomersWithSalesperson(),
    fetchGebietsaufteilung().catch(() => []),
  ]);

  const gebietsByCode = new Map(
    gebietsRows.map((g) => [g.salespersonCode.toUpperCase(), g.bundeslaender]),
  );

  const customersBySp = new Map();
  for (const c of customers) {
    if (!c.salespersonCode) continue;
    const key = c.salespersonCode.toUpperCase();
    if (!customersBySp.has(key)) customersBySp.set(key, []);
    customersBySp.get(key).push(c.number);
  }

  const spCodes = new Set(salespeople.map((sp) => sp.code.toUpperCase()));
  for (const key of customersBySp.keys()) {
    if (!spCodes.has(key)) {
      salespeople.push({
        code: key,
        name: key,
        email: '',
        blocked: false,
      });
    }
  }

  const enriched = salespeople.map((sp) => {
    const codeKey = sp.code.toUpperCase();
    const customerNumbers = [...new Set(customersBySp.get(codeKey) ?? [])];
    let bundeslaender = gebietsByCode.get(codeKey) ?? [];
    let gebietsSource = bundeslaender.length ? 'bc_custom' : 'derived';

    if (!bundeslaender.length && customerNumbers.length) {
      const blSet = new Set();
      for (const c of customers) {
        if (c.salespersonCode.toUpperCase() !== codeKey) continue;
        const bl = inferBundesland(c.postalCode, c.country, c.city);
        if (bl) blSet.add(bl);
      }
      bundeslaender = [...blSet].sort((a, b) => a.localeCompare(b, 'de'));
    }

    if (!bundeslaender.length) gebietsSource = 'none';

    return {
      code: sp.code,
      name: sp.name,
      email: sp.email || undefined,
      customerNumbers,
      customerCount: customerNumbers.length,
      bundeslaender,
      gebietsSource,
    };
  });

  const withCustomers = enriched.filter((sp) => sp.customerCount > 0);
  const team = (withCustomers.length ? withCustomers : enriched).sort((a, b) =>
    a.name.localeCompare(b.name, 'de'),
  );

  return {
    configured: true,
    salespeople: team,
    gebietsCustomAvailable: gebietsRows.length > 0,
    fetchedAt: new Date().toISOString(),
  };
}

/** @param {string} zip @param {string} country @param {string} [city] */
function inferBundesland(zip, country, city = '') {
  const plz = String(zip ?? '').trim();
  const cc = String(country ?? '').toUpperCase();
  const cityLower = String(city ?? '').toLowerCase();
  if (cc === 'AT' || (/^\d{4}$/.test(plz) && cc !== 'DE')) {
    const n = parseInt(plz, 10);
    if (Number.isNaN(n)) return null;
    if (/wien|vienna/.test(cityLower)) return 'Wien';
    if ((n >= 1010 && n <= 1239) || (n >= 1400 && n <= 1423)) return 'Wien';
    if (n >= 2000 && n <= 3999) return 'Niederösterreich';
    if (n >= 4000 && n <= 4999) return 'Oberösterreich';
    if (n >= 5000 && n <= 5999) return 'Salzburg';
    if (n >= 6000 && n <= 6699) return 'Tirol';
    if (n >= 6700 && n <= 6999) return 'Vorarlberg';
    if (n >= 7000 && n <= 7999) return 'Burgenland';
    if (n >= 8000 && n <= 8999) return 'Steiermark';
    if (n >= 9000 && n <= 9999) return 'Kärnten';
  }
  return null;
}

/** @param {'quote'|'invoice'|'conditionAgreement'} type */
export async function fetchBcDocumentsByCustomer(customerNo, type) {
  if (!customerNo?.trim()) {
    throw new Error('customerNo erforderlich');
  }
  if (type === 'quote') {
    return { type: 'quote', documents: await fetchSalesQuotesByCustomer(customerNo) };
  }
  if (type === 'invoice') {
    return { type: 'invoice', documents: await fetchSalesInvoicesByCustomer(customerNo) };
  }
  if (type === 'conditionAgreement') {
    const result = await fetchConditionAgreementsByCustomer(customerNo);
    return { type: 'conditionAgreement', ...result };
  }
  throw new Error('type muss quote, invoice oder conditionAgreement sein');
}
