import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ProfileRow } from '@/lib/database.types';

interface AuthContextValue {
  session: Session | null;
  profile: ProfileRow | null;
  loading: boolean;
  /** true пока не получили session с initial getSession() */
  initializing: boolean;
  /** Отправить OTP-код на email */
  signInWithOtp: (email: string) => Promise<void>;
  /** Подтвердить OTP. Возвращает true при успехе. */
  verifyOtp: (email: string, token: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  /** Перезагрузить profile из БД (например, после смены display_name) */
  refreshProfile: () => Promise<void>;
  /** Обновить профиль (display_name) */
  updateProfile: (patch: { display_name?: string }) => Promise<void>;
}

const AuthCtx = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      // eslint-disable-next-line no-console
      console.error('[auth] load profile failed', error);
      setProfile(null);
      return;
    }
    setProfile(data ?? null);
  }, []);

  // Initial session + listener
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setInitializing(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        void loadProfile(data.session.user.id);
      }
      setInitializing(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess?.user) {
        void loadProfile(sess.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signInWithOtp = useCallback(async (email: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyOtp = useCallback(
    async (email: string, token: string): Promise<boolean> => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: token.trim(),
          type: 'email',
        });
        if (error) throw error;
        if (data.session) {
          setSession(data.session);
          if (data.session.user) await loadProfile(data.session.user.id);
          return true;
        }
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loadProfile],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const updateProfile = useCallback(
    async (patch: { display_name?: string }) => {
      if (!session?.user) throw new Error('Не авторизован');
      const { error } = await supabase
        .from('profiles')
        .update(patch as never)
        .eq('id', session.user.id);
      if (error) throw error;
      await loadProfile(session.user.id);
    },
    [session, loadProfile],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      initializing,
      signInWithOtp,
      verifyOtp,
      signOut,
      refreshProfile,
      updateProfile,
    }),
    [
      session,
      profile,
      loading,
      initializing,
      signInWithOtp,
      verifyOtp,
      signOut,
      refreshProfile,
      updateProfile,
    ],
  );

  return createElement(AuthCtx.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const v = useContext(AuthCtx);
  if (!v) throw new Error('useAuth must be used within AuthProvider');
  return v;
}
