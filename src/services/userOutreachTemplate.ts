const STORAGE_PREFIX = 'pht_outreach_template:';

const DEFAULT_TEMPLATE = `Sehr geehrte Damen und Herren,

wir unterstützen Lebensmittelbetriebe mit industriellen Wasch-, Hygiene- und Schleusen-Anlagen.

Gerne würde ich einen kurzen Termin für ein persönliches Gespräch vereinbaren.

Mit freundlichen Grüßen
{{name}}
PHT`;

function storageKey(userKey: string): string {
  return `${STORAGE_PREFIX}${userKey.trim().toLowerCase()}`;
}

export function resolveOutreachUserKey(
  email?: string | null,
  username?: string | null,
  name?: string | null,
): string {
  return (email || username || name || 'default').trim().toLowerCase();
}

export function getOutreachTemplate(
  userKey: string,
  displayName?: string | null,
): string {
  try {
    const raw = localStorage.getItem(storageKey(userKey));
    const template = raw?.trim() || DEFAULT_TEMPLATE;
    const name = displayName?.trim() || 'Ihr PHT-Ansprechpartner';
    return template.replace(/\{\{name\}\}/g, name);
  } catch {
    return DEFAULT_TEMPLATE.replace(/\{\{name\}\}/g, displayName?.trim() || 'Ihr PHT-Ansprechpartner');
  }
}

export function getOutreachTemplateRaw(userKey: string): string {
  try {
    return localStorage.getItem(storageKey(userKey))?.trim() || DEFAULT_TEMPLATE;
  } catch {
    return DEFAULT_TEMPLATE;
  }
}

export function saveOutreachTemplate(userKey: string, template: string): void {
  localStorage.setItem(storageKey(userKey), template.trim());
}

export { DEFAULT_TEMPLATE };
