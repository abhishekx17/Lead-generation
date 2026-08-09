import { createContext, useContext } from 'react';
import { useSession, organization } from '../lib/auth-client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { data: session, isPending, error } = useSession();

  const value = {
    session,
    user: session?.user ?? null,
    isSuperAdmin: session?.user?.isSuperAdmin ?? false,
    isPending,
    error,
    organization,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
