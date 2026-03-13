import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppShell, Button, ErrorPanel, LoadingScreen, Panel, Select, Textarea } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { invokeEdgeFunction } from '../lib/api';
import { supabase } from '../lib/supabase';
import type {
  InterviewDifficulty,
  InterviewMode,
  JobTargetInsert,
  ParsedJD,
  ParsedResume,
  ResumeInsert,
  ResumeRow,
  SessionPlan,
  InterviewSessionRow,
  JobTargetRow,
} from '../lib/types';

function inferCompanyName(text: string): string | null {
  const match = text.match(/(?:Company|About|At)\s*:?\s*([A-Z][A-Za-z0-9&.\- ]{2,})/);
  return match?.[1]?.trim() ?? null;
}

export default function Setup() {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [params] = useSearchParams();
  const [resumes, setResumes] = useState<ResumeRow[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('new');
  const [newResumeText, setNewResumeText] = useState('');
  const [jobPosting, setJobPosting] = useState('');
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);
  const [parsedJD, setParsedJD] = useState<ParsedJD | null>(null);
  const [mode, setMode] = useState<InterviewMode>('mixed');
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>('medium');
  const [loading, setLoading] = useState(true);
  const [planning, setPlanning] = useState(false);
  const [parsingJD, setParsingJD] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const loadResumesAndPrefill = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: resumeData, error: resumeError } = await supabase
          .from('resumes')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (resumeError) {
          throw resumeError;
        }

        const nextResumes = (resumeData ?? []) as ResumeRow[];
        setResumes(nextResumes);

        if (nextResumes[0]) {
          setSelectedResumeId(nextResumes[0].id);
          setParsedResume(nextResumes[0].parsed_json);
        }

        const targetId = params.get('jobTargetId');
        if (targetId) {
          const { data: target, error: targetError } = await supabase
            .from('job_targets')
            .select('*')
            .eq('id', targetId)
            .maybeSingle();

          if (targetError) {
            throw targetError;
          }

          if (target) {
            const typedTarget = target as JobTargetRow;
            setJobPosting(typedTarget.raw_text);
            setParsedJD(typedTarget.parsed_json);
          }
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load setup data.');
      } finally {
        setLoading(false);
      }
    };

    void loadResumesAndPrefill();
  }, [params, userId]);

  const selectedResume = useMemo(
    () => resumes.find((resume) => resume.id === selectedResumeId) ?? null,
    [resumes, selectedResumeId],
  );

  useEffect(() => {
    if (selectedResumeId !== 'new' && selectedResume?.parsed_json) {
      setParsedResume(selectedResume.parsed_json);
    }
  }, [selectedResume, selectedResumeId]);

  const parseJobDescription = async () => {
    if (!jobPosting.trim()) {
      return;
    }

    setParsingJD(true);
    setError(null);

    try {
      const jd = await invokeEdgeFunction<{ jd_text: string }, ParsedJD>('extract-jd', {
        jd_text: jobPosting,
      });
      setParsedJD(jd);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : 'Unable to parse the job description.');
    } finally {
      setParsingJD(false);
    }
  };

  const handleStartInterview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) {
      return;
    }

    setPlanning(true);
    setError(null);

    try {
      let resumeId = selectedResumeId;
      let resumeJson = parsedResume;

      if (selectedResumeId === 'new') {
        if (!newResumeText.trim()) {
          throw new Error('Paste a resume before starting the interview.');
        }

        resumeJson = await invokeEdgeFunction<{ resume_text: string }, ParsedResume>('extract-resume', {
          resume_text: newResumeText,
        });

        const resumeInsert: ResumeInsert = {
          user_id: userId,
          raw_text: newResumeText,
          parsed_json: resumeJson,
        };

        const { data: createdResume, error: resumeError } = await supabase
          .from('resumes')
          .insert(resumeInsert as any)
          .select('*')
          .single();

        if (resumeError) {
          throw resumeError;
        }

        resumeId = (createdResume as ResumeRow).id;
      }

      if (!resumeJson) {
        throw new Error('Resume parsing is missing. Select a saved resume or paste a new one.');
      }

      let jdJson = parsedJD;
      if (!jdJson) {
        jdJson = await invokeEdgeFunction<{ jd_text: string }, ParsedJD>('extract-jd', {
          jd_text: jobPosting,
        });
        setParsedJD(jdJson);
      }

      const plan = await invokeEdgeFunction<
        { resume_json: ParsedResume; jd_json: ParsedJD; mode: InterviewMode; difficulty: InterviewDifficulty },
        SessionPlan
      >('plan-interview', {
        resume_json: resumeJson,
        jd_json: jdJson,
        mode,
        difficulty,
      });

      const jobTargetInsert: JobTargetInsert = {
        user_id: userId,
        raw_text: jobPosting,
        parsed_json: jdJson,
        role_title: jdJson.role_title,
        company_name: inferCompanyName(jobPosting),
      };

      const { data: jobTarget, error: jobTargetError } = await supabase
        .from('job_targets')
        .insert(jobTargetInsert as any)
        .select('*')
        .single();

      if (jobTargetError) {
        throw jobTargetError;
      }

      const { data: session, error: sessionError } = await supabase
        .from('interview_sessions')
        .insert(
          {
            user_id: userId,
            resume_id: resumeId,
            job_target_id: (jobTarget as JobTargetRow).id,
            mode,
            difficulty,
            session_plan: plan,
            status: 'in_progress',
          } as any,
        )
        .select('*')
        .single();

      if (sessionError) {
        throw sessionError;
      }

      navigate(`/interview/${(session as InterviewSessionRow).id}`);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Unable to start the interview.');
    } finally {
      setPlanning(false);
    }
  };

  if (loading) {
    return <LoadingScreen description="Loading your saved resumes and any setup draft." title="Preparing interview setup" />;
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-coral">Setup</p>
          <h1 className="text-4xl font-semibold text-white">Build your next mock interview</h1>
          <p className="text-base text-ink-300">
            Pick a resume, paste the target job, and choose how hard you want the interview to push.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleStartInterview}>
          <Panel className="space-y-5">
            <h2 className="text-xl font-semibold text-white">1. Resume</h2>
            <Select
              label="Choose a saved resume or paste a new one"
              onChange={(event) => setSelectedResumeId(event.target.value)}
              value={selectedResumeId}
            >
              {resumes.map((resume) => (
                <option key={resume.id} value={resume.id}>
                  Saved resume | {resume.created_at ? new Date(resume.created_at).toLocaleDateString() : resume.id}
                </option>
              ))}
              <option value="new">Paste a new resume</option>
            </Select>

            {selectedResumeId === 'new' ? (
              <Textarea
                label="New resume text"
                onChange={(event) => setNewResumeText(event.target.value)}
                placeholder="Paste the full resume text here."
                value={newResumeText}
              />
            ) : selectedResume?.parsed_json ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-ink-200">
                Loaded resume with {selectedResume.parsed_json.projects.length} projects and {selectedResume.parsed_json.experience.length} experience entries.
              </div>
            ) : null}
          </Panel>

          <Panel className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-semibold text-white">2. Job posting</h2>
              <Button disabled={parsingJD || !jobPosting.trim()} onClick={parseJobDescription} type="button" variant="secondary">
                {parsingJD ? 'Extracting JD...' : 'Extract preview'}
              </Button>
            </div>
            <Textarea
              label="Paste the full job description"
              onBlur={() => {
                if (!parsedJD && jobPosting.trim().length > 60) {
                  void parseJobDescription();
                }
              }}
              onChange={(event) => setJobPosting(event.target.value)}
              placeholder="Paste the job posting here."
              required
              value={jobPosting}
            />
            {parsedJD ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-coral">Extracted preview</p>
                <p className="mt-3 text-lg font-semibold text-white">{parsedJD.role_title}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {parsedJD.required_skills.map((skill) => (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-ink-100" key={skill}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </Panel>

          <Panel className="space-y-5">
            <h2 className="text-xl font-semibold text-white">3. Interview config</h2>
            <div className="grid gap-5 md:grid-cols-2">
              <Select label="Mode" onChange={(event) => setMode(event.target.value as InterviewMode)} value={mode}>
                <option value="behavioral">Behavioral</option>
                <option value="technical">Technical</option>
                <option value="mixed">Mixed</option>
                <option value="deep_dive">Deep dive</option>
                <option value="targeted">Targeted</option>
              </Select>
              <Select
                label="Difficulty"
                onChange={(event) => setDifficulty(event.target.value as InterviewDifficulty)}
                value={difficulty}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </Select>
            </div>
          </Panel>

          {error ? <ErrorPanel message={error} title="Interview setup failed" /> : null}

          <Button disabled={planning || !jobPosting.trim()} type="submit">
            {planning ? 'Planning interview...' : 'Start interview'}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
