import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell, Button, ErrorPanel, LoadingScreen, Panel, ProgressBar, Textarea } from '../components/ui';
import { invokeEdgeFunction } from '../lib/api';
import { supabase } from '../lib/supabase';
import type {
  AnswerEvaluation,
  InterviewSessionRow,
  ParsedResume,
  ProgressMetricInsert,
  QuestionPlan,
  SessionAnswerInsert,
  SessionAnswerRow,
  SessionPlan,
  SessionReport,
} from '../lib/types';

interface LoadedSession {
  session: InterviewSessionRow;
  resume: ParsedResume;
  plan: SessionPlan;
}

interface ActivePrompt {
  question: QuestionPlan;
  isFollowup: boolean;
  followupText: string | null;
  parentAnswerId: string | null;
}

function currentPromptText(prompt: ActivePrompt): string {
  return prompt.isFollowup && prompt.followupText ? prompt.followupText : prompt.question.question_text;
}

export default function Interview() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [loadedSession, setLoadedSession] = useState<LoadedSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activePrompt, setActivePrompt] = useState<ActivePrompt | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedAnswers, setSavedAnswers] = useState<SessionAnswerRow[]>([]);
  const [pendingAdvanceAnswers, setPendingAdvanceAnswers] = useState<SessionAnswerRow[] | null>(null);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const loadSession = async () => {
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

        if (!session.resume_id || !session.session_plan) {
          throw new Error('This interview session is missing its resume or session plan.');
        }

        const { data: resume, error: resumeError } = await supabase
          .from('resumes')
          .select('*')
          .eq('id', session.resume_id)
          .single();

        if (resumeError) {
          throw resumeError;
        }

        if (!resume.parsed_json) {
          throw new Error('The selected resume has no parsed data.');
        }

        const { data: answers, error: answersError } = await supabase
          .from('session_answers')
          .select('*')
          .eq('session_id', sessionId)
          .order('order_index', { ascending: true });

        if (answersError) {
          throw answersError;
        }

        if (session.session_plan.session_plan.length === 0) {
          throw new Error('This interview session has no questions.');
        }

        setSavedAnswers(answers ?? []);
        setLoadedSession({
          session,
          resume: resume.parsed_json,
          plan: session.session_plan,
        });
        setCurrentIndex(0);
        setActivePrompt({
          question: session.session_plan.session_plan[0],
          isFollowup: false,
          followupText: null,
          parentAnswerId: null,
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load the interview session.');
      } finally {
        setLoading(false);
      }
    };

    void loadSession();
  }, [sessionId]);

  const questionCount = loadedSession?.plan.session_plan.length ?? 0;
  const progress = useMemo(() => ((currentIndex + 1) / Math.max(questionCount, 1)) * 100, [currentIndex, questionCount]);

  const finalizeSession = async (answers: SessionAnswerRow[]) => {
    if (!loadedSession || !sessionId) {
      return;
    }

    const report = await invokeEdgeFunction<
      {
        session_id: string;
        answers: SessionAnswerRow[];
        session_plan: SessionPlan;
        resume_json: ParsedResume;
      },
      SessionReport
    >('generate-report', {
      session_id: sessionId,
      answers,
      session_plan: loadedSession.plan,
      resume_json: loadedSession.resume,
    });

    const { error: updateError } = await supabase
      .from('interview_sessions')
      .update({
        overall_score: report.overall_score,
        readiness_level: report.readiness_level,
        status: 'completed',
        completed_at: new Date().toISOString(),
        final_report: report,
      })
      .eq('id', sessionId);

    if (updateError) {
      throw updateError;
    }

    const metricRows: ProgressMetricInsert[] = [
      { user_id: loadedSession.session.user_id, metric_name: 'overall_score', metric_value: report.overall_score, session_id: sessionId },
      {
        user_id: loadedSession.session.user_id,
        metric_name: 'behavioral_score',
        metric_value: report.competency_scores.behavioral,
        session_id: sessionId,
      },
      {
        user_id: loadedSession.session.user_id,
        metric_name: 'technical_score',
        metric_value: report.competency_scores.technical,
        session_id: sessionId,
      },
      {
        user_id: loadedSession.session.user_id,
        metric_name: 'communication_score',
        metric_value: report.competency_scores.communication,
        session_id: sessionId,
      },
    ];

    await supabase.from('progress_metrics').insert(metricRows);
    navigate(`/results/${sessionId}`, { replace: true });
  };

  const advanceToNext = async (updatedAnswers: SessionAnswerRow[]) => {
    if (!loadedSession) {
      return;
    }

    const nextIndex = currentIndex + 1;
    const nextQuestion = loadedSession.plan.session_plan[nextIndex];

    if (!nextQuestion) {
      await finalizeSession(updatedAnswers);
      return;
    }

    setCurrentIndex(nextIndex);
    setActivePrompt({
      question: nextQuestion,
      isFollowup: false,
      followupText: null,
      parentAnswerId: null,
    });
    setAnswerText('');
  };

  const submitAnswer = async () => {
    if (!loadedSession || !activePrompt || !sessionId) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const evaluation = await invokeEdgeFunction<
        {
          question_text: string;
          answer_text: string;
          question_type: string;
          competency_tag: string;
          resume_json: ParsedResume;
        },
        AnswerEvaluation
      >('evaluate-answer', {
        question_text: currentPromptText(activePrompt),
        answer_text: answerText,
        question_type: activePrompt.question.question_type,
        competency_tag: activePrompt.question.competency_tag,
        resume_json: loadedSession.resume,
      });

      const insertPayload: SessionAnswerInsert = {
        session_id: sessionId,
        question_text: currentPromptText(activePrompt),
        question_type: activePrompt.question.question_type,
        competency_tag: activePrompt.question.competency_tag,
        order_index: activePrompt.question.order * 10 + (activePrompt.isFollowup ? 1 : 0),
        parent_id: activePrompt.parentAnswerId,
        answer_text: answerText,
        scores_json: evaluation.scores,
        critique_text: evaluation.provisional_critique,
        model_answer: activePrompt.question.strong_answer_shape,
        followup_triggered: activePrompt.isFollowup ? false : evaluation.followup_needed,
      };

      const { data: savedAnswer, error: insertError } = await supabase
        .from('session_answers')
        .insert(insertPayload)
        .select('*')
        .single();

      if (insertError) {
        throw insertError;
      }

      const updatedAnswers = [...savedAnswers, savedAnswer];
      setSavedAnswers(updatedAnswers);

      if (!activePrompt.isFollowup && evaluation.followup_needed && evaluation.followup_question) {
        setActivePrompt({
          question: activePrompt.question,
          isFollowup: true,
          followupText: evaluation.followup_question,
          parentAnswerId: savedAnswer.id,
        });
        setAnswerText('');
      } else {
        setPendingAdvanceAnswers(updatedAnswers);
        await advanceToNext(updatedAnswers);
        setPendingAdvanceAnswers(null);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Something went wrong, try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const retryCurrentStep = async () => {
    if (pendingAdvanceAnswers) {
      setSubmitting(true);
      setError(null);

      try {
        await advanceToNext(pendingAdvanceAnswers);
        setPendingAdvanceAnswers(null);
      } catch (retryError) {
        setError(retryError instanceof Error ? retryError.message : 'Something went wrong, try again.');
      } finally {
        setSubmitting(false);
      }

      return;
    }

    await submitAnswer();
  };

  if (loading) {
    return <LoadingScreen description="Pulling the session plan and previous progress." title="Loading interview room" />;
  }

  if (!loadedSession || !activePrompt) {
    return (
      <AppShell>
        <ErrorPanel
          action={
            <Button onClick={() => window.location.reload()} type="button">
              Retry
            </Button>
          }
          message={error ?? 'Unable to open this interview session.'}
          title="Interview unavailable"
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-ink-300">
            <span>
              Question {currentIndex + 1} of {questionCount}
            </span>
            <span className="capitalize">{loadedSession.session.mode} mode</span>
          </div>
          <ProgressBar value={progress} />
        </div>

        <Panel className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-coral">
            {activePrompt.isFollowup ? 'Follow-up question' : 'Current question'}
          </p>
          <h1 className="text-3xl font-semibold text-white">{currentPromptText(activePrompt)}</h1>
          {!activePrompt.isFollowup ? (
            <p className="text-sm text-ink-300">
              Competency: {activePrompt.question.competency_tag} | Type: {activePrompt.question.question_type}
            </p>
          ) : null}
        </Panel>

        <Panel className="space-y-5">
          <Textarea
            label="Your answer"
            onChange={(event) => setAnswerText(event.target.value)}
            placeholder="Type your answer here. Keep it specific and ownership-heavy."
            value={answerText}
          />

          {error ? (
            <ErrorPanel
              action={
                <Button
                  disabled={submitting}
                  onClick={() => void retryCurrentStep()}
                  type="button"
                >
                  Retry
                </Button>
              }
              message={error}
              title="Something went wrong, try again"
            />
          ) : null}

          <Button disabled={submitting || answerText.trim().length < 10} onClick={submitAnswer} type="button">
            {submitting ? 'Submitting answer...' : 'Submit answer'}
          </Button>
        </Panel>

        <Panel className="space-y-3">
          <p className="text-sm uppercase tracking-[0.24em] text-coral">Interview rules</p>
          <p className="text-sm text-ink-300">Scores stay hidden until the session ends. Follow-ups do not change the main question count.</p>
          <p className="text-sm text-ink-300">
            Aim for explicit ownership, concrete actions, and measurable outcomes in every answer.
          </p>
        </Panel>
      </div>
    </AppShell>
  );
}
