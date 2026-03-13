import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell, Button, ErrorPanel, Input, Panel } from '../components/ui';
import { supabase } from '../lib/supabase';

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          throw signUpError;
        }

        navigate('/onboarding', { replace: true });
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      navigate('/dashboard', { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to authenticate right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="grid min-h-[85vh] gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div className="space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-coral">MockLoop access</p>
          <h1 className="text-4xl font-semibold text-white sm:text-5xl">Train with your real stories, not templates.</h1>
          <p className="max-w-xl text-base text-ink-300">
            Create an account to store resumes, job targets, mock interviews, and your full coaching history.
          </p>
        </div>

        <Panel className="mx-auto w-full max-w-xl">
          <div className="mb-6 flex rounded-full bg-white/5 p-1">
            <button
              className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold transition ${
                mode === 'signup' ? 'bg-coral text-ink-950' : 'text-ink-300'
              }`}
              onClick={() => setMode('signup')}
              type="button"
            >
              Sign up
            </button>
            <button
              className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold transition ${
                mode === 'login' ? 'bg-coral text-ink-950' : 'text-ink-300'
              }`}
              onClick={() => setMode('login')}
              type="button"
            >
              Log in
            </button>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <Input
              autoComplete="email"
              label="Email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
            <Input
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              label="Password"
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 6 characters"
              required
              type="password"
              value={password}
            />

            {error ? (
              <ErrorPanel
                message={error}
                title={mode === 'signup' ? 'Sign up failed' : 'Log in failed'}
              />
            ) : null}

            <Button className="w-full" disabled={loading} type="submit">
              {loading ? 'Working...' : mode === 'signup' ? 'Create account' : 'Log in'}
            </Button>
          </form>
        </Panel>
      </div>
    </AppShell>
  );
}
