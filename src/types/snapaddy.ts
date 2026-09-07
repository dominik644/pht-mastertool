export interface SnapaddyCard {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  company: string;
  street: string;
  zip: string;
  city: string;
  country: string;
  website: string;
  receivedAt: string;
  status: 'pending' | 'applied' | 'dismissed';
}

export interface SnapaddyMatch {
  customerId: string;
  customerName: string;
  city: string;
  score: number;
  reason: string;
}
