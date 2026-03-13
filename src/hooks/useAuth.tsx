import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { AuthBootstrapState, ProfileRow, ResumeRow } from '../lib/types';

interface AuthContextValue extends AuthBootstrapState {
  loading: boolean;
  error: string | null;
  refreshBootstrap: () => Promise<void>;
  session: Session | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const initialState: AuthBootstrapState = {
  userId: null,
  email: null,
  profile: null,
  latestResume: null,
  onboardingComplete: false,
};

async function loadBootstrap(session: Session | null): Promise<AuthBootstrapState> {
  if (!session?.user) {
    return initialState;
  }

  const userId = session.user.id;

  const [
    { data: profile, error: profileError },
    { data: resume, error: resumeError },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase
      .from('resumes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (profileError && profileError.code !== 'PGRST116') {
    throw profileError;
  }

  if (resumeError && resumeError.code !== 'PGRST116') {
    throw resumeError;
  }

  return {
    userId,
    email: session.user.email ?? null,
    profile: profile ?? null,
    latestResume: resume ?? null,
    onboardingComplete: Boolean(profile && resume),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<AuthBootstrapState>(initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshBootstrap = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await supabase.auth.getSession();
      const nextSession = data.session;
      setSession(nextSession);
      const nextState = await loadBootstrap(nextSession);
      setState(nextState);
    } catch (refreshError) {
      setSession(null);
      setState(initialState);
      setError(refreshError instanceof Error ? refreshError.message : 'Unable to initialize authentication.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) {
          return;
        }

        setSession(data.session);
        const nextState = await loadBootstrap(data.session);
        if (!mounted) {
          return;
        }

        setState(nextState);
      } catch (bootstrapError) {
        if (!mounted) {
          return;
        }

        setSession(null);
        setState(initialState);
        setError(bootstrapError instanceof Error ? bootstrapError.message : 'Unable to initialize authentication.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, nextSession) => {
      if (!mounted) {
        return;
      }

      setLoading(true);
      setError(null);

      queueMicrotask(async () => {
        try {
          setSession(nextSession);
          const nextState = await loadBootstrap(nextSession);
          if (!mounted) {
            return;
          }

          setState(nextState);
        } catch (authError) {
          if (!mounted) {
            return;
          }

          setSession(null);
          setState(initialState);
          setError(authError instanceof Error ? authError.message : 'Unable to refresh authentication.');
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      loading,
      error,
      refreshBootstrap,
      session,
    }),
    [error, loading, session, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

export function countReadyStories(resume: ResumeRow | null): number {
  if (!resume?.parsed_json) {
    return 0;
  }

  const storyBank = resume.parsed_json.story_bank;
  return Object.values(storyBank).filter(Boolean).length;
}

export function profileName(profile: ProfileRow | null, email: string | null): string {
  if (profile?.name?.trim()) {
    return profile.name;
  }

  return email?.split('@')[0] ?? 'Candidate';
}
