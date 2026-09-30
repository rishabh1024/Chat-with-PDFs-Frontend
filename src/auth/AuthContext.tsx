import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { setAccessToken, setOnUnauthorized, setRefreshAccessToken } from '../config/api';
import { supabase } from '../lib/supabaseClient';
import { setStoredActiveConversationId } from '../utils/chatSession';

export type SessionOrigin = 'signed_in' | 'restored' | null;

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  sessionOrigin: SessionOrigin;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const syncTokenFromSession = (session: Session | null) => {
  setAccessToken(session?.access_token ?? null);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionOrigin, setSessionOrigin] = useState<SessionOrigin>(null);
  const interactiveSignInRef = useRef(false);
  const authStateChangeSeenRef = useRef(false);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    setStoredActiveConversationId(null);
    setAccessToken(null);
    setSessionOrigin(null);
    if (error) {
      throw error;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        if (authStateChangeSeenRef.current) {
          setLoading(false);
          return;
        }
        setSession(data.session);
        setSessionOrigin(data.session ? 'restored' : null);
        syncTokenFromSession(data.session);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      authStateChangeSeenRef.current = true;
      setSession(nextSession);
      if (!nextSession) {
        setSessionOrigin(null);
      } else if (event === 'SIGNED_IN' && interactiveSignInRef.current) {
        setSessionOrigin('signed_in');
        interactiveSignInRef.current = false;
      } else if (event === 'INITIAL_SESSION') {
        setSessionOrigin('restored');
      } else if (event === 'SIGNED_IN') {
        // Supabase can emit SIGNED_IN while restoring or refocusing an
        // existing session. Only an interactive login is a fresh sign-in.
        setSessionOrigin((current) => current ?? 'restored');
      }
      syncTokenFromSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => {
      void signOut().catch(() => {
        setAccessToken(null);
        setStoredActiveConversationId(null);
        setSession(null);
      });
    });

    return () => setOnUnauthorized(null);
  }, [signOut]);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      return null;
    }
    setSession(data.session);
    syncTokenFromSession(data.session);
    return data.session.access_token;
  }, []);

  useEffect(() => {
    setRefreshAccessToken(refreshAccessToken);
    return () => setRefreshAccessToken(null);
  }, [refreshAccessToken]);

  const signIn = useCallback(async (email: string, password: string) => {
    interactiveSignInRef.current = true;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      interactiveSignInRef.current = false;
      throw error;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    interactiveSignInRef.current = true;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          name: fullName,
        },
      },
    });
    if (error) {
      interactiveSignInRef.current = false;
      throw error;
    }
    if (!data.session) {
      interactiveSignInRef.current = false;
    }
    return { needsEmailConfirmation: !data.session };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      sessionOrigin,
      signIn,
      signUp,
      signOut,
    }),
    [session, loading, sessionOrigin, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
