import { AppShell, Badge, Button, Panel, SectionTitle } from '../components/ui';

const steps = [
  { title: 'Paste resume', detail: 'Bring your actual experience into the loop so every question is grounded in your history.' },
  { title: 'Generate interview', detail: 'MockLoop turns your resume and target role into a personalized interview plan.' },
  { title: 'Answer questions', detail: 'Work through focused prompts and dynamic follow-ups instead of generic chat.' },
  { title: 'Get scored', detail: 'Every answer is evaluated on relevance, specificity, structure, ownership, and results.' },
  { title: 'Retrain weak answers', detail: 'Retry the weakest questions with targeted coaching until your stories are sharp.' },
];

const comparisonRows = [
  ['Personalization', 'Questions built from your resume and target job', 'General prompts unless you manually steer every turn'],
  ['Scoring', 'Rubric-based scoring for each answer', 'No consistent scoring framework'],
  ['Follow-ups', 'Automatic follow-ups when your answer is vague or incomplete', 'Depends on prompting and often loses rigor'],
  ['Progress tracking', 'Sessions, weak areas, and readiness trend in one place', 'No durable progress model'],
  ['Retraining', 'Retry weak questions only', 'Manual copy-paste and ad hoc practice'],
];

const pricing = [
  {
    name: 'Free',
    price: '$0',
    details: ['3 full mock interviews', 'Full results + coaching', '1 resume + 1 job target'],
  },
  {
    name: 'Pro',
    price: '$12/month',
    details: ['Unlimited interviews', 'Progress tracking', 'Retry mode', 'Unlimited saved targets'],
  },
];

export default function Landing() {
  return (
    <AppShell>
      <header className="flex items-center justify-between py-4">
        <p className="text-lg font-bold uppercase tracking-[0.24em] text-sand">MockLoop</p>
        <div className="flex items-center gap-3">
          <Button to="/auth" variant="ghost">
            Sign in
          </Button>
          <Button to="/auth">Get started</Button>
        </div>
      </header>

      <main className="space-y-24 pb-12 pt-10">
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-8">
            <Badge>AI interview training for CS students</Badge>
            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-6xl">
                Stop practicing. Start training.
              </h1>
              <p className="max-w-3xl text-lg text-ink-300">
                MockLoop turns your resume and the job posting into a personalized mock interview with dynamic
                follow-ups, rubric-based scoring, and targeted coaching, so you know exactly what to fix before the
                real thing.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="text-base" to="/auth">
                Start your first mock interview
              </Button>
            </div>
          </div>

          <Panel className="relative overflow-hidden">
            <div className="absolute -right-10 top-4 h-32 w-32 rounded-full bg-coral/20 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-mint/20 blur-3xl" />
            <div className="relative space-y-6">
              <p className="text-sm uppercase tracking-[0.24em] text-coral">Training loop</p>
              <div className="space-y-4">
                {['Simulate', 'Evaluate', 'Diagnose', 'Retrain', 'Retest'].map((item, index) => (
                  <div className="flex items-center gap-4" key={item}>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-lg font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white">{item}</p>
                      <p className="text-sm text-ink-300">
                        {item === 'Simulate' && 'Generate a job-specific interview from your own background.'}
                        {item === 'Evaluate' && 'Score every answer against a consistent rubric.'}
                        {item === 'Diagnose' && 'Find the exact missing dimensions in your stories.'}
                        {item === 'Retrain' && 'Retry only the answers that cost you points.'}
                        {item === 'Retest' && 'Loop again until your readiness level moves.'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </section>

        <section className="space-y-8">
          <SectionTitle
            eyebrow="How it works"
            title="A mock interview system, not a blank chat box"
            description="Every stage is designed to mimic the parts of interviewing that actually decide outcomes."
          />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            {steps.map((step, index) => (
              <Panel key={step.title} className="h-full">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-coral/15 text-lg font-semibold text-coral">
                  {index + 1}
                </div>
                <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-ink-300">{step.detail}</p>
              </Panel>
            ))}
          </div>
        </section>

        <section className="space-y-8">
          <SectionTitle
            eyebrow="Why not ChatGPT"
            title="Because generic practice produces generic answers"
            description="MockLoop tracks progress, pushes follow-ups, and forces answer structure the same way a real interviewer does."
          />
          <Panel className="overflow-hidden p-0">
            <div className="hidden grid-cols-3 border-b border-white/10 bg-white/5 text-sm font-semibold text-white md:grid">
              <div className="px-5 py-4">Capability</div>
              <div className="px-5 py-4">MockLoop</div>
              <div className="px-5 py-4">ChatGPT</div>
            </div>
            {comparisonRows.map(([feature, mockloop, chatgpt]) => (
              <div className="grid grid-cols-1 border-b border-white/10 text-sm last:border-b-0 md:grid-cols-3" key={feature}>
                <div className="px-5 py-4 font-semibold text-white">{feature}</div>
                <div className="px-5 py-4 text-emerald-200">
                  <p className="mb-1 text-xs uppercase tracking-[0.18em] text-ink-400 md:hidden">MockLoop</p>
                  {mockloop}
                </div>
                <div className="px-5 py-4 text-ink-300">
                  <p className="mb-1 text-xs uppercase tracking-[0.18em] text-ink-400 md:hidden">ChatGPT</p>
                  {chatgpt}
                </div>
              </div>
            ))}
          </Panel>
        </section>

        <section className="space-y-8">
          <SectionTitle
            eyebrow="Pricing"
            title="Start free. Upgrade when you need volume."
            description="The free plan is enough to feel the system. Pro is for active interview prep."
          />
          <div className="grid gap-6 md:grid-cols-2">
            {pricing.map((tier) => (
              <Panel className="flex h-full flex-col justify-between" key={tier.name}>
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-coral">{tier.name}</p>
                  <h3 className="mt-3 text-4xl font-semibold text-white">{tier.price}</h3>
                  <div className="mt-6 space-y-3">
                    {tier.details.map((detail) => (
                      <p className="text-sm text-ink-200" key={detail}>
                        {detail}
                      </p>
                    ))}
                  </div>
                </div>
                <Button className="mt-8" to="/auth" variant={tier.name === 'Pro' ? 'secondary' : 'primary'}>
                  Start free
                </Button>
              </Panel>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-6 text-sm text-ink-400">
        MockLoop | Personalized interview training for CS candidates.
      </footer>
    </AppShell>
  );
}
