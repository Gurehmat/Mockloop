import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { callGemini, corsHeaders, jsonResponse } from '../_shared/gemini.ts';

interface SessionReport {
  overall_score: number;
  readiness_level: 'not ready' | 'developing' | 'ready' | 'strong';
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

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = (await request.json()) as {
      session_id?: string;
      answers?: unknown;
      session_plan?: unknown;
      resume_json?: unknown;
    };

    if (!body.session_id || !body.answers || !body.session_plan || !body.resume_json) {
      return jsonResponse({ error: 'session_id, answers, session_plan, and resume_json are required' }, 400);
    }

    const prompt = `You are generating a final interview performance report. Return ONLY valid JSON. No markdown, no backticks.

{
  "overall_score": number (0-100),
  "readiness_level": "not ready" | "developing" | "ready" | "strong",
  "strongest_answers": [question_ids as strings],
  "weakest_answers": [question_ids as strings],
  "recurring_issues": [string],
  "competency_scores": {
    "behavioral": number (0-100),
    "technical": number (0-100),
    "communication": number (0-100)
  },
  "drill_recommendations": [string],
  "coaching_notes": [
    {
      "question_id": string,
      "what_was_missing": string,
      "better_structure": string,
      "model_answer": string
    }
  ]
}

Readiness levels:
- not ready: overall_score < 50
- developing: 50-69
- ready: 70-84
- strong: 85+

recurring_issues: patterns across answers, not per-answer. E.g. "You avoided quantifying outcomes in 4 of 6 behavioral answers." Be specific.
drill_recommendations: specific actions. Not "practice more" but "Redo the ownership drill on your [project name] story - you consistently said 'we' without clarifying your individual role."
coaching_notes model_answer: write a strong version of the answer using the candidate's actual resume content.

Answers data:
${JSON.stringify(body.answers)}

Session plan:
${JSON.stringify(body.session_plan)}

Candidate resume:
${JSON.stringify(body.resume_json)}`;

    const parsed = await callGemini<SessionReport>(prompt);
    return jsonResponse(parsed);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Failed to generate report' }, 500);
  }
});
