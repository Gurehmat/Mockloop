export type ProfileRole = 'SWE' | 'backend' | 'fullstack' | 'ML' | 'other';
export type ExperienceLevel = 'student' | 'new_grad' | '1-2yr';
export type InterviewMode = 'behavioral' | 'technical' | 'mixed' | 'deep_dive' | 'targeted';
export type InterviewDifficulty = 'easy' | 'medium' | 'hard';
export type InterviewStatus = 'in_progress' | 'completed' | 'abandoned';
export type QuestionType = 'behavioral' | 'technical' | 'fit' | 'project';
export type StoryCategory = 'challenge' | 'teamwork' | 'failure' | 'leadership' | 'initiative';
export type FollowupTrigger = 'vague_answer' | 'no_outcome' | 'no_ownership' | 'always';
export type AnswerQuality = 'sufficient' | 'weak' | 'strong';
export type ReadinessLevel = 'not ready' | 'developing' | 'ready' | 'strong';

export interface ParsedResume {
  education: { institution: string; degree: string; grad_year: string }[];
  experience: { company: string; role: string; duration: string; bullets: string[] }[];
  projects: {
    name: string;
    technologies: string[];
    what_was_built: string;
    individual_contribution: string;
    measurable_outcome: string;
    difficulty_signals: string[];
    story_categories: StoryCategory[];
  }[];
  story_bank: {
    challenge: { source: string; summary: string } | null;
    teamwork: { source: string; summary: string } | null;
    failure: { source: string; summary: string } | null;
    leadership: { source: string; summary: string } | null;
    initiative: { source: string; summary: string } | null;
  };
  weak_spots: string[];
  likely_probes: string[];
}

export interface ParsedJD {
  role_title: string;
  required_skills: string[];
  preferred_skills: string[];
  behavioral_traits_implied: string[];
  technical_expectations: string[];
  likely_question_topics: string[];
}

export interface QuestionPlan {
  order: number;
  question_text: string;
  question_type: QuestionType;
  competency_tag: string;
  why_asking: string;
  strong_answer_shape: string;
  followup_tree: {
    trigger: FollowupTrigger;
    followup_question: string;
  }[];
}

export interface SessionPlan {
  session_plan: QuestionPlan[];
  rubric_weights: { behavioral: number; technical: number; communication: number };
}

export interface AnswerEvaluation {
  answer_quality: AnswerQuality;
  scores: {
    relevance: number;
    specificity: number;
    structure: number;
    ownership: number;
    result_clarity: number;
  };
  missing_dimensions: string[];
  followup_needed: boolean;
  followup_question: string | null;
  provisional_critique: string;
}

export interface SessionReport {
  overall_score: number;
  readiness_level: ReadinessLevel;
  strongest_answers: string[];
  weakest_answers: string[];
  recurring_issues: string[];
  competency_scores: { behavioral: number; technical: number; communication: number };
  drill_recommendations: string[];
  coaching_notes: {
    question_id: string;
    what_was_missing: string;
    better_structure: string;
    model_answer: string;
  }[];
}

export interface SessionAnswerPayload {
  id: string;
  question_text: string;
  question_type: string | null;
  competency_tag: string | null;
  answer_text: string | null;
  scores_json: AnswerEvaluation['scores'] | null;
  critique_text: string | null;
  model_answer: string | null;
  followup_triggered: boolean | null;
  order_index: number | null;
  parent_id: string | null;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          name: string | null;
          target_role: ProfileRole | null;
          experience_level: ExperienceLevel | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string | null;
          target_role?: ProfileRole | null;
          experience_level?: ExperienceLevel | null;
          created_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      resumes: {
        Row: {
          id: string;
          user_id: string;
          raw_text: string;
          parsed_json: ParsedResume | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          raw_text: string;
          parsed_json?: ParsedResume | null;
          created_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['resumes']['Insert']>;
      };
      job_targets: {
        Row: {
          id: string;
          user_id: string;
          role_title: string | null;
          company_name: string | null;
          raw_text: string;
          parsed_json: ParsedJD | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          role_title?: string | null;
          company_name?: string | null;
          raw_text: string;
          parsed_json?: ParsedJD | null;
          created_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['job_targets']['Insert']>;
      };
      interview_sessions: {
        Row: {
          id: string;
          user_id: string;
          resume_id: string | null;
          job_target_id: string | null;
          mode: InterviewMode | null;
          difficulty: InterviewDifficulty | null;
          status: InterviewStatus | null;
          session_plan: SessionPlan | null;
          overall_score: number | null;
          readiness_level: ReadinessLevel | null;
          started_at: string | null;
          completed_at: string | null;
          final_report: SessionReport | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          resume_id?: string | null;
          job_target_id?: string | null;
          mode?: InterviewMode | null;
          difficulty?: InterviewDifficulty | null;
          status?: InterviewStatus | null;
          session_plan?: SessionPlan | null;
          overall_score?: number | null;
          readiness_level?: ReadinessLevel | null;
          started_at?: string | null;
          completed_at?: string | null;
          final_report?: SessionReport | null;
        };
        Update: Partial<Database['public']['Tables']['interview_sessions']['Insert']>;
      };
      session_answers: {
        Row: {
          id: string;
          session_id: string;
          question_text: string;
          question_type: string | null;
          competency_tag: string | null;
          order_index: number | null;
          parent_id: string | null;
          answer_text: string | null;
          scores_json: AnswerEvaluation['scores'] | null;
          critique_text: string | null;
          model_answer: string | null;
          followup_triggered: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          question_text: string;
          question_type?: string | null;
          competency_tag?: string | null;
          order_index?: number | null;
          parent_id?: string | null;
          answer_text?: string | null;
          scores_json?: AnswerEvaluation['scores'] | null;
          critique_text?: string | null;
          model_answer?: string | null;
          followup_triggered?: boolean | null;
          created_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['session_answers']['Insert']>;
      };
      progress_metrics: {
        Row: {
          id: string;
          user_id: string;
          metric_name: string | null;
          metric_value: number | null;
          session_id: string | null;
          recorded_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          metric_name?: string | null;
          metric_value?: number | null;
          session_id?: string | null;
          recorded_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['progress_metrics']['Insert']>;
      };
    };
  };
}

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ResumeRow = Database['public']['Tables']['resumes']['Row'];
export type ResumeInsert = Database['public']['Tables']['resumes']['Insert'];
export type JobTargetRow = Database['public']['Tables']['job_targets']['Row'];
export type JobTargetInsert = Database['public']['Tables']['job_targets']['Insert'];
export type InterviewSessionRow = Database['public']['Tables']['interview_sessions']['Row'];
export type InterviewSessionInsert = Database['public']['Tables']['interview_sessions']['Insert'];
export type SessionAnswerRow = Database['public']['Tables']['session_answers']['Row'];
export type SessionAnswerInsert = Database['public']['Tables']['session_answers']['Insert'];
export type ProgressMetricInsert = Database['public']['Tables']['progress_metrics']['Insert'];

export interface AuthBootstrapState {
  userId: string | null;
  email: string | null;
  profile: ProfileRow | null;
  latestResume: ResumeRow | null;
  onboardingComplete: boolean;
}
