import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { AuthBootstrapState, ProfileRow, ResumeRow } from '../lib/types';

interface AuthContextValue extends AuthBootstrapState {
  loading: boolean;
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

  const [{ data: profile }, { data: resume }] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase
      .from('resumes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

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

  const refreshBootstrap = async () => {
    setLoading(true);
    const { data } = await supabase.auth.getSession();
    const nextSession = data.session;
    setSession(nextSession);
    const nextState = await loadBootstrap(nextSession);
    setState(nextState);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) {
        return;
      }

      setSession(data.session);
      const nextState = await loadBootstrap(data.session);
      if (!mounted) {
        return;
      }
      setState(nextState);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, nextSession) => {
      if (!mounted) {
        return;
      }
      setSession(nextSession);
      const nextState = await loadBootstrap(nextSession);
      if (!mounted) {
        return;
      }
      setState(nextState);
      setLoading(false);
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
      refreshBootstrap,
      session,
    }),
    [loading, session, state],
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
