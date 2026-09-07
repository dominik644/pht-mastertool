const SESSION_KEY = 'pht_client_session';

export function getClientSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function setClientSessionToken(token: string | null): void {
  try {
    if (!token) localStorage.removeItem(SESSION_KEY);
    else localStorage.setItem(SESSION_KEY, token);
  } catch {
    /* private mode */
  }
}

export function clearClientSessionToken(): void {
  setClientSessionToken(null);
}

function isAppApiUrl(url: string): boolean {
  if (url.startsWith('/api/')) return true;
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin && parsed.pathname.startsWith('/api/');
  } catch {
    return false;
  }
}

/** Keep login across reloads when the HttpOnly cookie is dropped (mobile / in-app browsers). */
export function installAppSessionFetch(): void {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
    if (!isAppApiUrl(url)) return nativeFetch(input, init);

    const headers = new Headers(init.headers);
    const token = getClientSessionToken();
    if (token && !headers.has('Authorization') && !url.includes('/api/auth/login')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return nativeFetch(input, { ...init, credentials: init.credentials ?? 'include', headers });
  };
}
