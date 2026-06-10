import {
  PublicClientApplication,
  type AccountInfo,
  InteractionRequiredAuthError,
} from '@azure/msal-browser';
import { MS_DEFAULT_USER, MS_SCOPES } from '../config/microsoft';

const CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID ?? '';
const TENANT_ID = import.meta.env.VITE_AZURE_TENANT_ID ?? 'common';

export interface MicrosoftUser {
  name: string;
  email: string;
}

let msalInstance: PublicClientApplication | null = null;
let initPromise: Promise<PublicClientApplication | null> | null = null;

export function isMicrosoftConfigured(): boolean {
  return Boolean(CLIENT_ID);
}

export function getMicrosoftConfig() {
  return {
    clientId: CLIENT_ID,
    tenantId: TENANT_ID,
    configured: isMicrosoftConfigured(),
    defaultUser: MS_DEFAULT_USER,
  };
}

function createMsal(): PublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId: CLIENT_ID,
      authority: `https://login.microsoftonline.com/${TENANT_ID}`,
      redirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
    },
    cache: { cacheLocation: 'localStorage' },
  });
}

export async function getMsalInstance(): Promise<PublicClientApplication | null> {
  if (!isMicrosoftConfigured()) return null;
  if (msalInstance) return msalInstance;
  if (!initPromise) {
    initPromise = (async () => {
      const app = createMsal();
      await app.initialize();
      msalInstance = app;
      return app;
    })();
  }
  return initPromise;
}

function accountToUser(account: AccountInfo): MicrosoftUser {
  return {
    name: account.name ?? account.username,
    email: account.username,
  };
}

export async function signInMicrosoft(): Promise<{ user: MicrosoftUser | null; message: string }> {
  const msal = await getMsalInstance();
  if (!msal) {
    return {
      user: null,
      message: `Azure App nicht konfiguriert. VITE_AZURE_CLIENT_ID in .env.local setzen für ${MS_DEFAULT_USER}.`,
    };
  }

  try {
    const result = await msal.loginPopup({
      scopes: [...MS_SCOPES],
      loginHint: MS_DEFAULT_USER,
      prompt: 'select_account',
    });
    const user = accountToUser(result.account!);
    localStorage.setItem('pht_ms_user', JSON.stringify(user));
    return { user, message: `Angemeldet als ${user.email}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen';
    return { user: null, message: msg };
  }
}

export async function signOutMicrosoft(): Promise<void> {
  const msal = await getMsalInstance();
  const accounts = msal?.getAllAccounts() ?? [];
  if (msal && accounts.length) {
    await msal.logoutPopup({ account: accounts[0] });
  }
  localStorage.removeItem('pht_ms_user');
}

export function getStoredMicrosoftUser(): MicrosoftUser | null {
  try {
    const raw = localStorage.getItem('pht_ms_user');
    return raw ? (JSON.parse(raw) as MicrosoftUser) : null;
  } catch {
    return null;
  }
}

export async function getActiveAccount(): Promise<AccountInfo | null> {
  const msal = await getMsalInstance();
  if (!msal) return null;
  const accounts = msal.getAllAccounts();
  if (accounts.length) return accounts[0];
  return null;
}

export async function acquireGraphToken(): Promise<string | null> {
  const msal = await getMsalInstance();
  if (!msal) return null;

  const account = await getActiveAccount();
  if (!account) return null;

  const request = { scopes: [...MS_SCOPES], account };

  try {
    const silent = await msal.acquireTokenSilent(request);
    return silent.accessToken;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      const popup = await msal.acquireTokenPopup({ ...request, loginHint: MS_DEFAULT_USER });
      return popup.accessToken;
    }
    return null;
  }
}

export async function getCurrentMicrosoftUser(): Promise<MicrosoftUser | null> {
  const account = await getActiveAccount();
  if (account) return accountToUser(account);
  return getStoredMicrosoftUser();
}
