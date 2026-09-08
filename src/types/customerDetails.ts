export interface ContactPerson {
  name: string;
  email: string;
  phone: string;
  role: string;
}

export interface CustomerAddress {
  street: string;
  plz: string;
  ort: string;
  land: string;
}

export interface RelatedCompany {
  companyName: string;
  relationType: string;
  bcCustomerNo?: string;
}

/** Ein Besuchstag mit Keywords für die Übersicht (eingeklappt sichtbar). */
export interface VisitReport {
  id: string;
  /** ISO-Datum YYYY-MM-DD */
  date: string;
  /** Kurz-Stichworte, damit man weiß worum es geht */
  keywords: string[];
  /** Freitext Besuchsbericht */
  notes: string;
  /** Offen = ausgeklappt in der UI (nur lokal, optional) */
  open?: boolean;
}

export interface CustomerDetails {
  ansprechperson: ContactPerson;
  additionalContacts?: ContactPerson[];
  rechnungsadresse: CustomerAddress;
  lieferadresse: CustomerAddress;
  lieferadresseWieRechnung: boolean;
  zugehoerigeFirmen: RelatedCompany[];
  /** Besuchsberichte chronologisch (neueste zuerst empfohlen) */
  visitReports?: VisitReport[];
  bcCustomerId?: string;
  bcCustomerNumber?: string;
  bcLastSync?: string;
  bcSalespersonCode?: string;
  bcSalespersonName?: string;
  bcBlocked?: boolean;
  bcPaymentTerms?: string;
  bcCounty?: string;
  /** Letzte Verkaufsrechnung aus BC (ISO-Datum) */
  bcLastInvoiceDate?: string;
  /** Tage seit letzter Rechnung (BC) */
  bcDaysSincePurchase?: number | null;
  /** Zeitpunkt der letzten BC-Umsatz-Abfrage */
  bcPurchaseCheckedAt?: string;
}

export type CustomerDetailsStore = Record<string, CustomerDetails>;

export const EMPTY_CONTACT: ContactPerson = { name: '', email: '', phone: '', role: '' };
export const EMPTY_ADDRESS: CustomerAddress = { street: '', plz: '', ort: '', land: 'AT' };

export function emptyCustomerDetails(): CustomerDetails {
  return {
    ansprechperson: { ...EMPTY_CONTACT },
    rechnungsadresse: { ...EMPTY_ADDRESS },
    lieferadresse: { ...EMPTY_ADDRESS },
    lieferadresseWieRechnung: true,
    zugehoerigeFirmen: [],
    visitReports: [],
  };
}

export function createEmptyVisitReport(date = new Date().toISOString().slice(0, 10)): VisitReport {
  return {
    id: `visit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date,
    keywords: [],
    notes: '',
    open: true,
  };
}
