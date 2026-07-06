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

export interface CustomerDetails {
  ansprechperson: ContactPerson;
  rechnungsadresse: CustomerAddress;
  lieferadresse: CustomerAddress;
  lieferadresseWieRechnung: boolean;
  zugehoerigeFirmen: RelatedCompany[];
  bcCustomerId?: string;
  bcCustomerNumber?: string;
  bcLastSync?: string;
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
  };
}
