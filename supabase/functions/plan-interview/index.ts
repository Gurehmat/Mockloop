import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { callGemini, corsHeaders, jsonResponse } from '../_shared/gemini.ts';

interface QuestionPlan {
  order: number;
  question_text: string;
  question_type: 'behavioral' | 'technical' | 'fit' | 'project';
  competency_tag: string;
  why_asking: string;
  strong_answer_shape: string;
  followup_tree: {
    trigger: 'vague_answer' | 'no_outcome' | 'no_ownership' | 'always';
    followup_question: string;
  }[];
}

interface SessionPlan {
  session_plan: QuestionPlan[];
  rubric_weights: { behavioral: number; technical: number; communication: number };
}

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = (await request.json()) as {
      resume_json?: unknown;
      jd_json?: unknown;
      mode?: string;
      difficulty?: string;
    };

    if (!body.resume_json || !body.jd_json || !body.mode || !body.difficulty) {
      return jsonResponse({ error: 'resume_json, jd_json, mode, and difficulty are required' }, 400);
    }

    const prompt = `You are planning a mock interview. Return ONLY valid JSON. No markdown, no backticks.

Generate exactly 8 interview questions for the candidate below.

Mode: ${body.mode}
- behavioral = 6 behavioral + 2 project questions
- technical = 2 behavioral + 6 technical/project questions
- mixed = 3 behavioral + 3 technical + 2 project questions
- deep_dive = 8 questions all derived from the resume projects only
- targeted = weight heavily toward skills in the job description

Difficulty: ${body.difficulty}
- easy = broad questions, single follow-up
- medium = probing questions, 2 follow-ups
- hard = pressure questions, 2 aggressive follow-ups

Return:
{
  "session_plan": [
    {
      "order": number,
      "question_text": string,
      "question_type": "behavioral" | "technical" | "fit" | "project",
      "competency_tag": string,
      "why_asking": string,
      "strong_answer_shape": string,
      "followup_tree": [
        {
          "trigger": "vague_answer" | "no_outcome" | "no_ownership" | "always",
          "followup_question": string
        }
      ]
    }
  ],
  "rubric_weights": {
    "behavioral": number,
    "technical": number,
    "communication": number
  }
}

Critical rules:
- Use the candidate's actual project names and technologies in questions. Never write a generic question when a personalized one is possible.
- followup_tree triggers: vague_answer = answer lacks specifics, no_outcome = no measurable result stated, no_ownership = unclear what they personally did, always = ask regardless
- strong_answer_shape describes what a good answer would include (e.g. "STAR format with specific metric in result")
- rubric_weights must sum to 1.0

Candidate profile:
${JSON.stringify(body.resume_json)}

Job description data:
${JSON.stringify(body.jd_json)}`;

    const parsed = await callGemini<SessionPlan>(prompt);
    return jsonResponse(parsed);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Failed to plan interview' }, 500);
  }
});
