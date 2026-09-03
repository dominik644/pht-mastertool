import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';

export interface AppUser {
  email: string;
  username?: string | null;
  name: string;
  admin: boolean;
  role: 'admin' | 'user';
  bcSalespersonCode?: string | null;
  salesRep?: string | null;
  mustChangePassword?: boolean;
}

interface AppAuthContextValue {
  user: AppUser | null;
  loading: boolean;
  configured: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string; user?: AppUser | null }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>;
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

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error ?? 'Anmeldung fehlgeschlagen' };
    }
    setUser(data.user ?? null);
    setConfigured(true);
    return { ok: true, user: data.user ?? null };
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      let message = data.error ?? 'Passwortänderung fehlgeschlagen';
      if (typeof message === 'string' && message.startsWith('{')) {
        try {
          const parsed = JSON.parse(message);
          message = parsed.message ?? message;
        } catch {
          // keep raw
        }
      }
      return { ok: false, error: message };
    }
    setUser(data.user ?? null);
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, configured, login, changePassword, logout, refresh }),
    [user, loading, configured, login, changePassword, logout, refresh],
  );

  return <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>;
}

export function useAppAuth() {
  const ctx = useContext(AppAuthContext);
  if (!ctx) throw new Error('useAppAuth requires AppAuthProvider');
  return ctx;
}
