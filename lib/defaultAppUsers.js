import { hashPassword } from './appAuth.js';

/** @typedef {{ username: string, email: string, name: string, admin: boolean, salesRep: string, passwordHash: string, mustChangePassword: boolean, disabled?: boolean }} DefaultAppUser */

const COLLEAGUES = [
  { username: 'DominikWeller', name: 'Dominik Weller', email: 'weller@pht.group', admin: true },
  { username: 'RudolfTripold', name: 'Rudolf Tripold', email: 'rudolf.tripold@pht.group', admin: true },
  { username: 'AndreasSchmidt', name: 'Andreas Schmidt', email: 'andreas.schmidt@pht.group', admin: false },
  { username: 'AndyRehbein', name: 'Andy Rehbein', email: 'andy.rehbein@pht.group', admin: false },
  { username: 'DanielBeck', name: 'Daniel Beck', email: 'daniel.beck@pht.group', admin: false },
  { username: 'HolgerStefani', name: 'Holger Stefani', email: 'holger.stefani@pht.group', admin: false },
  { username: 'RonaldGross', name: 'Ronald Gross', email: 'ronald.gross@pht.group', admin: false },
  { username: 'StefanWern', name: 'Stefan Wern', email: 'stefan.wern@pht.group', admin: false },
  { username: 'ThomasRaab', name: 'Thomas Raab', email: 'thomas.raab@pht.group', admin: false },
];

const INITIAL_PASSWORD = '1234';

let cachedDefaultHash = null;

export function defaultPasswordHash() {
  if (!cachedDefaultHash) cachedDefaultHash = hashPassword(INITIAL_PASSWORD);
  return cachedDefaultHash;
}

export function buildDefaultAppUsers() {
  const hash = defaultPasswordHash();
  return COLLEAGUES.map((c) => ({
    ...c,
    email: c.email.toLowerCase(),
    salesRep: c.name,
    passwordHash: hash,
    mustChangePassword: true,
    disabled: false,
    source: 'default',
  }));
}

export function nameToUsername(name) {
  return String(name).replace(/\s+/g, '');
}

export { INITIAL_PASSWORD, COLLEAGUES };
