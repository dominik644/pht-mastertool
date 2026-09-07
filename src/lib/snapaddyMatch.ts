import type { CustomerPriority } from '../types/customerPriority';
import type { SnapaddyCard, SnapaddyMatch } from '../types/snapaddy';

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(gmbh|ag|kg|se|ohg|ltd|inc|s\.?r\.?o\.?|e\.?u\.?)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function emailDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() ?? '';
}

export function matchSnapaddyCard(
  card: SnapaddyCard,
  customers: CustomerPriority[],
  limit = 5,
): SnapaddyMatch[] {
  const company = norm(card.company);
  const domain = emailDomain(card.email);
  const zip = card.zip.replace(/\s+/g, '');
  const city = norm(card.city);
  const scored: SnapaddyMatch[] = [];

  for (const c of customers) {
    let score = 0;
    const reasons: string[] = [];
    const cName = norm(c.name);

    if (company && cName && (cName === company || cName.includes(company) || company.includes(cName))) {
      score += 80;
      reasons.push('Firmenname');
    }
    if (domain && c.contactEmail && emailDomain(c.contactEmail) === domain) {
      score += 40;
      reasons.push('E-Mail-Domain');
    }
    if (zip && c.zip && zip === String(c.zip).replace(/\s+/g, '')) {
      score += 25;
      reasons.push('PLZ');
    }
    if (city && norm(c.city) === city) {
      score += 15;
      reasons.push('Ort');
    }
    if (score >= 40) {
      scored.push({
        customerId: c.id,
        customerName: c.name,
        city: c.city,
        score,
        reason: reasons.join(' · '),
      });
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
