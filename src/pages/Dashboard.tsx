import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell, Badge, Button, ErrorPanel, LoadingScreen, Panel, ProgressBar } from '../components/ui';
import { countReadyStories, profileName, useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import type { InterviewSessionRow, JobTargetRow, SessionAnswerRow } from '../lib/types';

interface DashboardState {
  sessions: InterviewSessionRow[];
  weakAreas: { tag: string; misses: number }[];
  jobTargets: JobTargetRow[];
}

function averageScore(answer: SessionAnswerRow): number {
  if (!answer.scores_json) {
    return 0;
  }

  const values = Object.values(answer.scores_json);
  return values.reduce((sum, score) => sum + score, 0) / values.length;
}

export default function Dashboard() {
  const { userId, email, profile, latestResume, loading: authLoading } = useAuth();
  const [state, setState] = useState<DashboardState>({
    sessions: [],
    weakAreas: [],
    jobTargets: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: sessions, error: sessionError } = await supabase
          .from('interview_sessions')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'completed')
          .order('started_at', { ascending: false })
          .limit(5);

        if (sessionError) {
          throw sessionError;
        }

        const lastTwoSessionIds = ((sessions ?? []) as InterviewSessionRow[]).slice(0, 2).map((session) => session.id);
        let weakAreas: { tag: string; misses: number }[] = [];

        if (lastTwoSessionIds.length > 0) {
          const { data: answers, error: answersError } = await supabase
            .from('session_answers')
            .select('*')
            .in('session_id', lastTwoSessionIds);

          if (answersError) {
            throw answersError;
          }

          const counts = new Map<string, number>();

          ((answers ?? []) as SessionAnswerRow[]).forEach((answer) => {
            if (!answer.competency_tag) {
              return;
            }

            if (averageScore(answer) < 3) {
              counts.set(answer.competency_tag, (counts.get(answer.competency_tag) ?? 0) + 1);
            }
          });

          weakAreas = Array.from(counts.entries())
            .map(([tag, misses]) => ({ tag, misses }))
            .sort((left, right) => right.misses - left.misses)
            .slice(0, 3);
        }

        const { data: jobTargets, error: jobTargetError } = await supabase
          .from('job_targets')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (jobTargetError) {
          throw jobTargetError;
        }

        setState({
          sessions: sessions ?? [],
          weakAreas,
          jobTargets: jobTargets ?? [],
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load your dashboard.');
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, [userId]);

  const readyStories = useMemo(() => countReadyStories(latestResume), [latestResume]);
  const candidate = useMemo(() => profileName(profile, email), [email, profile]);

  if (authLoading || loading) {
    return <LoadingScreen description="Pulling your most recent sessions, weak spots, and saved targets." title="Loading dashboard" />;
  }

  if (error) {
    return (
      <AppShell>
        <ErrorPanel
          action={
            <Button onClick={() => window.location.reload()} type="button">
              Retry
            </Button>
          }
          message={error}
          title="Dashboard unavailable"
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Panel>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-coral">Dashboard</p>
            <h1 className="mt-3 text-4xl font-semibold text-white">Welcome back, {candidate}.</h1>
            <p className="mt-3 max-w-2xl text-base text-ink-300">
              Use the latest resume and job target to generate another realistic loop or retry weak answers from a completed session.
            </p>
            <div className="mt-6">
              <Button to="/setup">Start new mock</Button>
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-coral">Resume readiness</p>
                <p className="mt-2 text-3xl font-semibold text-white">{readyStories} of 5 stories ready</p>
              </div>
              <Badge tone={readyStories >= 4 ? 'green' : readyStories >= 2 ? 'orange' : 'red'}>
                {readyStories >= 4 ? 'Strong base' : readyStories >= 2 ? 'Needs polish' : 'Thin story bank'}
              </Badge>
            </div>
            <p className="mt-4 text-sm text-ink-300">
              Based on the most recent parsed resume and how many story categories have a clear example.
            </p>
          </Panel>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Panel>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Recent sessions</h2>
              <Badge>{state.sessions.length} saved</Badge>
            </div>

            <div className="space-y-4">
              {state.sessions.length === 0 ? (
                <p className="text-sm text-ink-300">No sessions yet. Start a mock interview to generate your first results.</p>
              ) : (
                state.sessions.map((session) => (
                  <Link
                    className="block rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                    key={session.id}
                    to={`/results/${session.id}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-base font-semibold capitalize text-white">{session.mode ?? 'Interview'} interview</p>
                        <p className="text-sm text-ink-300">
                          {session.started_at ? new Date(session.started_at).toLocaleDateString() : 'No date'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          tone={
                            session.readiness_level === 'strong'
                              ? 'blue'
                              : session.readiness_level === 'ready'
                                ? 'green'
                                : session.readiness_level === 'developing'
                                  ? 'orange'
                                  : 'red'
                          }
                        >
                          {session.readiness_level ?? 'in progress'}
                        </Badge>
                        <span className="text-lg font-semibold text-white">{session.overall_score ?? '--'}</span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Panel>

          <div className="space-y-6">
            <Panel>
              <h2 className="text-xl font-semibold text-white">Weak areas</h2>
              <div className="mt-5 space-y-4">
                {state.weakAreas.length === 0 ? (
                  <p className="text-sm text-ink-300">No weak patterns yet. Complete two sessions to reveal repeat misses.</p>
                ) : (
                  state.weakAreas.map((area) => (
                    <div key={area.tag}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-white">{area.tag}</span>
                        <span className="text-ink-300">{area.misses} low-scoring answers</span>
                      </div>
                      <ProgressBar value={Math.min(100, area.misses * 28)} />
                    </div>
                  ))
                )}
              </div>
            </Panel>

            <Panel>
              <h2 className="text-xl font-semibold text-white">Saved job targets</h2>
              <div className="mt-5 space-y-3">
                {state.jobTargets.length === 0 ? (
                  <p className="text-sm text-ink-300">Paste a job posting in setup to save your first target.</p>
                ) : (
                  state.jobTargets.map((target) => (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4" key={target.id}>
                      <p className="font-semibold text-white">{target.role_title ?? 'Untitled role'}</p>
                      <p className="text-sm text-ink-300">{target.company_name ?? 'Company not extracted'}</p>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
