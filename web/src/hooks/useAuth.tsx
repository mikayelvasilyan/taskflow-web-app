import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { api, isApiError, type User } from '@/api/client';
import { qk } from '@/api/queries/keys';

interface AuthValue {
  user: User | null;
  isLoading: boolean;
  login: (input: { email: string; password: string }) => Promise<User>;
  signup: (input: { name: string; email: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<unknown>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  // Drop cached data from the previous user but keep the `me` query itself, so its observer stays attached.
  const clearOthers = useCallback(
    () => qc.removeQueries({ predicate: (q) => q.queryKey[0] !== qk.me[0] }),
    [qc],
  );
  const me = useQuery({
    queryKey: qk.me,
    retry: false,
    staleTime: 60_000,
    queryFn: async () => {
      try {
        return (await api.get<{ user: User }>('/auth/me')).user;
      } catch (e) {
        if (isApiError(e) && e.status === 401) return null;
        throw e;
      }
    },
  });

  const login = useCallback<AuthValue['login']>(
    async (input) => {
      const { user } = await api.post<{ user: User }>('/auth/login', input);
      clearOthers();
      qc.setQueryData(qk.me, user);
      return user;
    },
    [qc, clearOthers],
  );

  const signup = useCallback<AuthValue['signup']>(
    async (input) => {
      const { user } = await api.post<{ user: User }>('/auth/signup', input);
      clearOthers();
      qc.setQueryData(qk.me, user);
      return user;
    },
    [qc, clearOthers],
  );

  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    clearOthers();
    qc.setQueryData(qk.me, null);
  }, [qc, clearOthers]);

  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: qk.me }), [qc]);

  const value = useMemo<AuthValue>(
    () => ({ user: me.data ?? null, isLoading: me.isLoading, login, signup, logout, refresh }),
    [me.data, me.isLoading, login, signup, logout, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
