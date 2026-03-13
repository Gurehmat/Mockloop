import { type FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell, Button, ErrorPanel, Panel, Select, Textarea } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { invokeEdgeFunction } from '../lib/api';
import { supabase } from '../lib/supabase';
import type { ExperienceLevel, ParsedResume, ProfileRole } from '../lib/types';

export default function Onboarding() {
  const navigate = useNavigate();
  const { userId, email, refreshBootstrap } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [targetRole, setTargetRole] = useState<ProfileRole>('SWE');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('student');
  const [resumeText, setResumeText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const candidateName = useMemo(() => email?.split('@')[0] ?? 'Candidate', [email]);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) {
      return;
    }

    setLoading(true);
    setError(null);

      try {
        const { error: profileError } = await supabase.from('profiles').upsert(
          {
            user_id: userId,
            name: candidateName,
            target_role: targetRole,
            experience_level: experienceLevel,
          } as any,
        );

      if (profileError) {
        throw profileError;
      }

      setStep(2);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save your profile.');
    } finally {
      setLoading(false);
    }
  };

  const saveResume = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) {
      return;
    }

    setLoading(true);
    setError(null);

      try {
        const parsedResume = await invokeEdgeFunction<{ resume_text: string }, ParsedResume>('extract-resume', {
          resume_text: resumeText,
        });

        const { error: resumeError } = await supabase.from('resumes').insert(
          {
            user_id: userId,
            raw_text: resumeText,
            parsed_json: parsedResume,
          } as any,
        );

      if (resumeError) {
        throw resumeError;
      }

      await refreshBootstrap();
      navigate('/dashboard', { replace: true });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save your resume.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-8 py-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-coral">Onboarding</p>
          <h1 className="text-4xl font-semibold text-white">Build your training profile</h1>
          <p className="text-base text-ink-300">
            MockLoop needs your target role and resume before it can generate a personalized interview.
          </p>
        </div>

        <div className="flex gap-3">
          {[1, 2].map((value) => (
            <div className="flex items-center gap-3" key={value}>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                  step === value ? 'bg-coral text-ink-950' : 'bg-white/10 text-ink-300'
                }`}
              >
                {value}
              </div>
              <span className="text-sm text-ink-300">{value === 1 ? 'Profile' : 'Resume'}</span>
            </div>
          ))}
        </div>

        {step === 1 ? (
          <Panel>
            <form className="space-y-5" onSubmit={saveProfile}>
              <Select label="Target role" onChange={(event) => setTargetRole(event.target.value as ProfileRole)} value={targetRole}>
                <option value="SWE">SWE</option>
                <option value="backend">Backend</option>
                <option value="fullstack">Fullstack</option>
                <option value="ML">ML</option>
                <option value="other">Other</option>
              </Select>
              <Select
                label="Experience level"
                onChange={(event) => setExperienceLevel(event.target.value as ExperienceLevel)}
                value={experienceLevel}
              >
                <option value="student">Student</option>
                <option value="new_grad">New grad</option>
                <option value="1-2yr">1-2 years</option>
              </Select>

              {error ? <ErrorPanel message={error} title="Profile setup failed" /> : null}

              <Button disabled={loading} type="submit">
                {loading ? 'Saving...' : 'Continue'}
              </Button>
            </form>
          </Panel>
        ) : (
          <Panel>
            <form className="space-y-5" onSubmit={saveResume}>
              <Textarea
                label="Paste your resume text"
                onChange={(event) => setResumeText(event.target.value)}
                placeholder="Paste the full text of your resume here."
                required
                value={resumeText}
              />

              {error ? <ErrorPanel message={error} title="Resume import failed" /> : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => setStep(1)} type="button" variant="secondary">
                  Back
                </Button>
                <Button disabled={loading || resumeText.trim().length < 50} type="submit">
                  {loading ? 'Extracting resume...' : 'Finish onboarding'}
                </Button>
              </div>
            </form>
          </Panel>
        )}
      </div>
    </AppShell>
  );
}
