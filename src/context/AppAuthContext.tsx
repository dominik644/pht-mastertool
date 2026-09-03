import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';

export interface AppUser {
  email: string;
  name: string;
  admin: boolean;
  role: 'admin' | 'user';
  bcSalespersonCode?: string | null;
  salesRep?: string | null;
}

interface AppAuthContextValue {
  user: AppUser | null;
  loading: boolean;
  configured: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AppAuthContext = createContext<AppAuthContextValue | null>(null);

async function fetchMe(): Promise<{ configured: boolean; user: AppUser | null }> {
  const res = await fetch('/api/auth/me', { credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  return {
    configured: data.configured !== false,
    user: data.user ?? null,
  };
}

export function AppAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);

  const refresh = useCallback(async () => {
    const data = await fetchMe();
    setConfigured(data.configured);
    setUser(data.user);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error ?? 'Anmeldung fehlgeschlagen' };
    }
    setUser(data.user ?? null);
    setConfigured(true);
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, configured, login, logout, refresh }),
    [user, loading, configured, login, logout, refresh],
  );

  return <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>;
}

export function useAppAuth() {
  const ctx = useContext(AppAuthContext);
  if (!ctx) throw new Error('useAppAuth requires AppAuthProvider');
  return ctx;
}
