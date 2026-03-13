import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell, Badge, Button, ErrorPanel, LoadingScreen, Panel, ProgressBar } from '../components/ui';
import { supabase } from '../lib/supabase';
import type { InterviewSessionRow, QuestionPlan, SessionAnswerRow, SessionPlan } from '../lib/types';

interface ResultsState {
  session: InterviewSessionRow;
  answers: SessionAnswerRow[];
}

function badgeTone(level: InterviewSessionRow['readiness_level']): 'red' | 'orange' | 'green' | 'blue' {
  switch (level) {
    case 'strong':
      return 'blue';
    case 'ready':
      return 'green';
    case 'developing':
      return 'orange';
    default:
      return 'red';
  }
}

function answerAverage(answer: SessionAnswerRow): number {
  if (!answer.scores_json) {
    return 0;
  }

  const values = Object.values(answer.scores_json);
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 20);
}

function questionsById(plan: SessionPlan | null): Map<string, QuestionPlan> {
  return new Map((plan?.session_plan ?? []).map((question) => [String(question.order), question]));
}

export default function Results() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<ResultsState | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const loadResults = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: session, error: sessionError } = await supabase
          .from('interview_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessionError) {
          throw sessionError;
        }

        const { data: answers, error: answersError } = await supabase
          .from('session_answers')
          .select('*')
          .eq('session_id', sessionId)
          .order('order_index', { ascending: true });

        if (answersError) {
          throw answersError;
        }

        setState({
          session,
          answers: answers ?? [],
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load session results.');
      } finally {
        setLoading(false);
      }
    };

    void loadResults();
  }, [sessionId]);

  const report = state?.session.final_report ?? null;
  const answerLookup = useMemo(() => new Map((state?.answers ?? []).map((answer) => [answer.id, answer])), [state?.answers]);
  const planLookup = useMemo(() => questionsById(state?.session.session_plan ?? null), [state?.session.session_plan]);

  const strongestAnswers = (report?.strongest_answers ?? [])
    .map((id) => answerLookup.get(id))
    .filter((value): value is SessionAnswerRow => Boolean(value));
  const weakestAnswers = (report?.weakest_answers ?? [])
    .map((id) => answerLookup.get(id))
    .filter((value): value is SessionAnswerRow => Boolean(value));

  const retryWeakQuestions = async () => {
    if (!state) {
      return;
    }

    setRetrying(true);
    setError(null);

    try {
      const weakQuestions = state.answers.filter((answer) => {
        if (!answer.scores_json || answer.parent_id) {
          return false;
        }

        return Object.values(answer.scores_json).some((score) => score < 3);
      });

      if (weakQuestions.length === 0) {
        throw new Error('No weak questions were found in this session.');
      }

      const retryPlan: SessionPlan = {
        rubric_weights: state.session.session_plan?.rubric_weights ?? {
          behavioral: 0.35,
          technical: 0.4,
          communication: 0.25,
        },
        session_plan: weakQuestions.map((answer, index) => ({
          order: index + 1,
          question_text: answer.question_text,
          question_type: (answer.question_type as QuestionPlan['question_type']) ?? 'behavioral',
          competency_tag: answer.competency_tag ?? 'targeted_retry',
          why_asking: 'Retrying a previously weak answer to improve readiness.',
          strong_answer_shape: answer.model_answer ?? 'Use STAR structure with concrete ownership and a measurable result.',
          followup_tree: [
            {
              trigger: 'always',
              followup_question: 'Tighten this answer: what did you personally own and what outcome changed because of your work?',
            },
          ],
        })),
      };

      const { data: newSession, error: newSessionError } = await supabase
        .from('interview_sessions')
        .insert({
          user_id: state.session.user_id,
          resume_id: state.session.resume_id,
          job_target_id: state.session.job_target_id,
          mode: 'targeted',
          difficulty: state.session.difficulty,
          status: 'in_progress',
          session_plan: retryPlan,
        } as any)
        .select('*')
        .single();

      if (newSessionError) {
        throw newSessionError;
      }

      navigate(`/interview/${(newSession as InterviewSessionRow).id}`);
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : 'Unable to create retry session.');
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return <LoadingScreen description="Collecting the final report, answer critiques, and strongest/weakest patterns." title="Loading results" />;
  }

  if (!state || !report) {
    return (
      <AppShell>
        <ErrorPanel
          action={
            <Button onClick={() => navigate('/dashboard')} type="button">
              Back to dashboard
            </Button>
          }
          message="This session does not have a final report yet."
          title="Results unavailable"
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <Panel>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-coral">Final score</p>
            <h1 className="mt-3 text-6xl font-semibold text-white">{report.overall_score}</h1>
            <div className="mt-4">
              <Badge tone={badgeTone(report.readiness_level)}>{report.readiness_level}</Badge>
            </div>
            <p className="mt-4 text-sm text-ink-300">
              {state.session.completed_at ? `Completed on ${new Date(state.session.completed_at).toLocaleString()}` : 'Session complete'}
            </p>
          </Panel>

          <Panel>
            <h2 className="text-xl font-semibold text-white">Competency breakdown</h2>
            <div className="mt-6 space-y-5">
              {Object.entries(report.competency_scores).map(([key, value]) => (
                <div key={key}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium capitalize text-white">{key}</span>
                    <span className="text-ink-300">{value}</span>
                  </div>
                  <ProgressBar value={value} />
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Panel>
            <h2 className="text-xl font-semibold text-white">Strongest answers</h2>
            <div className="mt-5 space-y-3">
              {strongestAnswers.length === 0 ? (
                <p className="text-sm text-ink-300">No strongest answers were identified in the report.</p>
              ) : (
                strongestAnswers.map((answer) => (
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4" key={answer.id}>
                    <p className="font-semibold text-white">{answer.question_text}</p>
                    <p className="mt-2 text-sm text-emerald-100">Score: {answerAverage(answer)}</p>
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel>
            <h2 className="text-xl font-semibold text-white">Weakest answers</h2>
            <div className="mt-5 space-y-3">
              {weakestAnswers.length === 0 ? (
                <p className="text-sm text-ink-300">No weakest answers were identified in the report.</p>
              ) : (
                weakestAnswers.map((answer) => (
                  <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4" key={answer.id}>
                    <p className="font-semibold text-white">{answer.question_text}</p>
                    <p className="mt-2 text-sm text-red-100">Score: {answerAverage(answer)}</p>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </section>

        <Panel>
          <h2 className="text-xl font-semibold text-white">Recurring issues</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {report.recurring_issues.map((issue) => (
              <div className="rounded-2xl border border-orange-400/20 bg-orange-500/10 p-4" key={issue}>
                <p className="text-sm text-orange-100">{issue}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-xl font-semibold text-white">Answer breakdown</h2>
          <div className="mt-5 space-y-4">
            {state.answers.map((answer) => {
              const isOpen = expandedId === answer.id;
              const note = report.coaching_notes.find((entry) => entry.question_id === answer.id);
              const questionMetadata = answer.parent_id ? planLookup.get(String(Math.floor((answer.order_index ?? 0) / 10))) : null;

              return (
                <div className="rounded-2xl border border-white/10 bg-white/5" key={answer.id}>
                  <button
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    onClick={() => setExpandedId(isOpen ? null : answer.id)}
                    type="button"
                  >
                    <div>
                      <p className="text-base font-semibold text-white">{answer.question_text}</p>
                      <p className="mt-2 text-sm text-ink-300">
                        {answer.question_type} | {answer.competency_tag} | Score {answerAverage(answer)}
                      </p>
                    </div>
                    <span className="text-sm text-ink-300">{isOpen ? 'Hide' : 'Show'}</span>
                  </button>

                  {isOpen ? (
                    <div className="space-y-5 border-t border-white/10 px-5 py-5">
                      {questionMetadata?.why_asking ? (
                        <p className="text-sm text-ink-300">Why this was asked: {questionMetadata.why_asking}</p>
                      ) : null}

                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-coral">Your answer</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-ink-100">{answer.answer_text}</p>
                      </div>

                      {answer.scores_json ? (
                        <div className="grid gap-3 md:grid-cols-5">
                          {Object.entries(answer.scores_json).map(([key, value]) => (
                            <div className="rounded-2xl bg-ink-900/70 p-3" key={key}>
                              <p className="text-xs uppercase tracking-[0.18em] text-ink-400">{key}</p>
                              <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-coral">Critique</p>
                        <p className="mt-2 text-sm text-ink-100">{answer.critique_text}</p>
                      </div>

                      {note?.better_structure ? (
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-coral">Better structure</p>
                          <p className="mt-2 text-sm text-ink-100">{note.better_structure}</p>
                        </div>
                      ) : null}

                      <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4">
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-100">Model answer</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-sky-50">
                          {note?.model_answer ?? answer.model_answer}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-xl font-semibold text-white">Drill recommendations</h2>
          <div className="mt-5 space-y-3">
            {report.drill_recommendations.map((recommendation) => (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-ink-200" key={recommendation}>
                {recommendation}
              </div>
            ))}
          </div>
        </Panel>

        {error ? <ErrorPanel message={error} title="Results action failed" /> : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button disabled={retrying} onClick={retryWeakQuestions} type="button">
            {retrying ? 'Creating retry session...' : 'Retry weak questions'}
          </Button>
          <Button
            onClick={() => navigate(`/setup?jobTargetId=${state.session.job_target_id ?? ''}`)}
            type="button"
            variant="secondary"
          >
            New mock with same job target
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
