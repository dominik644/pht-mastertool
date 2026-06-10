import { MS_DEFAULT_USER } from '../config/microsoft';

const STORAGE_KEY = 'pht_integration_email';

export function getTargetEmail(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)?.trim();
    if (stored && isValidEmail(stored)) return stored;
  } catch {
    /* ignore */
  }
  return MS_DEFAULT_USER;
}

export function setTargetEmail(email: string): void {
  const trimmed = email.trim();
  if (!isValidEmail(trimmed)) throw new Error('Ungültige E-Mail-Adresse');
  localStorage.setItem(STORAGE_KEY, trimmed);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
