create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  name text,
  target_role text check (target_role in ('SWE', 'backend', 'fullstack', 'ML', 'other')),
  experience_level text check (experience_level in ('student', 'new_grad', '1-2yr')),
  created_at timestamptz default now()
);

create table if not exists resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  raw_text text not null,
  parsed_json jsonb,
  created_at timestamptz default now()
);

create table if not exists job_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  role_title text,
  company_name text,
  raw_text text not null,
  parsed_json jsonb,
  created_at timestamptz default now()
);

create table if not exists interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  resume_id uuid references resumes,
  job_target_id uuid references job_targets,
  mode text check (mode in ('behavioral', 'technical', 'mixed', 'deep_dive', 'targeted')),
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  status text check (status in ('in_progress', 'completed', 'abandoned')) default 'in_progress',
  session_plan jsonb,
  overall_score int,
  readiness_level text,
  started_at timestamptz default now(),
  completed_at timestamptz,
  final_report jsonb
);

create table if not exists session_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references interview_sessions not null,
  question_text text not null,
  question_type text,
  competency_tag text,
  order_index int,
  parent_id uuid references session_answers,
  answer_text text,
  scores_json jsonb,
  critique_text text,
  model_answer text,
  followup_triggered bool default false,
  created_at timestamptz default now()
);

create table if not exists progress_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  metric_name text,
  metric_value float,
  session_id uuid references interview_sessions,
  recorded_at timestamptz default now()
);

create index if not exists idx_resumes_user_id on resumes (user_id, created_at desc);
create index if not exists idx_job_targets_user_id on job_targets (user_id, created_at desc);
create index if not exists idx_interview_sessions_user_id on interview_sessions (user_id, started_at desc);
create index if not exists idx_session_answers_session_id on session_answers (session_id, order_index);
create index if not exists idx_progress_metrics_user_id on progress_metrics (user_id, recorded_at desc);

alter table profiles enable row level security;
alter table resumes enable row level security;
alter table job_targets enable row level security;
alter table interview_sessions enable row level security;
alter table session_answers enable row level security;
alter table progress_metrics enable row level security;

create policy "Users own profiles select" on profiles
  for select using (auth.uid() = user_id);
create policy "Users own profiles insert" on profiles
  for insert with check (auth.uid() = user_id);
create policy "Users own profiles update" on profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users own profiles delete" on profiles
  for delete using (auth.uid() = user_id);

create policy "Users own resumes select" on resumes
  for select using (auth.uid() = user_id);
create policy "Users own resumes insert" on resumes
  for insert with check (auth.uid() = user_id);
create policy "Users own resumes update" on resumes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users own resumes delete" on resumes
  for delete using (auth.uid() = user_id);

create policy "Users own job targets select" on job_targets
  for select using (auth.uid() = user_id);
create policy "Users own job targets insert" on job_targets
  for insert with check (auth.uid() = user_id);
create policy "Users own job targets update" on job_targets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users own job targets delete" on job_targets
  for delete using (auth.uid() = user_id);

create policy "Users own interview sessions select" on interview_sessions
  for select using (auth.uid() = user_id);
create policy "Users own interview sessions insert" on interview_sessions
  for insert with check (auth.uid() = user_id);
create policy "Users own interview sessions update" on interview_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users own interview sessions delete" on interview_sessions
  for delete using (auth.uid() = user_id);

create policy "Users own session answers select" on session_answers
  for select using (
    session_id in (select id from interview_sessions where user_id = auth.uid())
  );
create policy "Users own session answers insert" on session_answers
  for insert with check (
    session_id in (select id from interview_sessions where user_id = auth.uid())
  );
create policy "Users own session answers update" on session_answers
  for update using (
    session_id in (select id from interview_sessions where user_id = auth.uid())
  )
  with check (
    session_id in (select id from interview_sessions where user_id = auth.uid())
  );
create policy "Users own session answers delete" on session_answers
  for delete using (
    session_id in (select id from interview_sessions where user_id = auth.uid())
  );

create policy "Users own progress metrics select" on progress_metrics
  for select using (auth.uid() = user_id);
create policy "Users own progress metrics insert" on progress_metrics
  for insert with check (auth.uid() = user_id);
create policy "Users own progress metrics update" on progress_metrics
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users own progress metrics delete" on progress_metrics
  for delete using (auth.uid() = user_id);
