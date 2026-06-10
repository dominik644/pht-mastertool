import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { MS_DEFAULT_USER } from '../config/microsoft';
import { getTargetEmail, setTargetEmail as persistTargetEmail } from '../services/integrationSettings';
import {
  getCurrentMicrosoftUser,
  isMicrosoftConfigured,
  signInMicrosoft,
  signOutMicrosoft,
  type MicrosoftUser,
} from '../services/microsoftAuth';

interface MicrosoftAuthContextValue {
  user: MicrosoftUser | null;
  configured: boolean;
  defaultUser: string;
  targetEmail: string;
  setTargetEmail: (email: string) => void;
  loading: boolean;
  signIn: () => Promise<string>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const MicrosoftAuthContext = createContext<MicrosoftAuthContextValue | null>(null);

export function MicrosoftAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MicrosoftUser | null>(null);
  const [targetEmail, setTargetEmailState] = useState(getTargetEmail);
  const [loading, setLoading] = useState(true);

  const setTargetEmail = useCallback((email: string) => {
    persistTargetEmail(email);
    setTargetEmailState(email);
  }, []);

  const refresh = useCallback(async () => {
    const current = await getCurrentMicrosoftUser();
    setUser(current);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const signIn = useCallback(async () => {
    const result = await signInMicrosoft();
    if (result.user) setUser(result.user);
    return result.message;
  }, []);

  const signOut = useCallback(async () => {
    await signOutMicrosoft();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      configured: isMicrosoftConfigured(),
      defaultUser: MS_DEFAULT_USER,
      targetEmail,
      setTargetEmail,
      loading,
      signIn,
      signOut,
      refresh,
    }),
    [user, targetEmail, setTargetEmail, loading, signIn, signOut, refresh],
  );

  return <MicrosoftAuthContext.Provider value={value}>{children}</MicrosoftAuthContext.Provider>;
}

export function useMicrosoftAuth() {
  const ctx = useContext(MicrosoftAuthContext);
  if (!ctx) throw new Error('useMicrosoftAuth requires MicrosoftAuthProvider');
  return ctx;
}
