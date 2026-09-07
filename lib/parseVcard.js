/** Minimal vCard parser for Snapaddy „Kontakt teilen“ / .vcf export. */

function firstLineValue(fields, key) {
  const v = fields[key];
  if (!v) return '';
  return Array.isArray(v) ? String(v[0] ?? '').trim() : String(v).trim();
}

export function parseVcard(text) {
  const unfolded = String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n[ \t]/g, '');
  const blocks = unfolded.split(/BEGIN:VCARD/i).slice(1);
  const cards = [];

  for (const block of blocks) {
    const fields = {};
    for (const rawLine of block.split('\n')) {
      const line = rawLine.trim();
      if (!line || /^END:VCARD/i.test(line)) continue;
      const idx = line.indexOf(':');
      if (idx < 0) continue;
      const keyPart = line.slice(0, idx);
      const value = line.slice(idx + 1).trim();
      const key = keyPart.split(';')[0].toUpperCase();
      if (!fields[key]) fields[key] = [];
      fields[key].push(value);
      if (key === 'TEL' && /CELL|MOBILE|CELLULAR|VOICE/i.test(keyPart)) {
        if (!fields.CELL) fields.CELL = [];
        fields.CELL.push(value);
      }
    }

    const n = firstLineValue(fields, 'N').split(';');
    const lastName = (n[0] || '').trim();
    const firstName = (n[1] || '').trim();
    const org = firstLineValue(fields, 'ORG').split(';')[0].trim();
    const adr = firstLineValue(fields, 'ADR').split(';');

    cards.push({
      firstName,
      lastName,
      fullName: firstLineValue(fields, 'FN') || [firstName, lastName].filter(Boolean).join(' '),
      email: firstLineValue(fields, 'EMAIL'),
      phone: firstLineValue(fields, 'CELL') || firstLineValue(fields, 'TEL'),
      role: firstLineValue(fields, 'TITLE') || firstLineValue(fields, 'ROLE'),
      company: org,
      street: (adr[2] || '').trim(),
      city: (adr[3] || '').trim(),
      zip: (adr[5] || '').trim(),
      country: (adr[6] || '').trim() || 'AT',
      website: firstLineValue(fields, 'URL'),
    });
  }

  return cards.filter((c) => c.company || c.fullName || c.email);
}
