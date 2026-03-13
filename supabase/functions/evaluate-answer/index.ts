import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { callGemini, corsHeaders, jsonResponse } from '../_shared/gemini.ts';

interface AnswerEvaluation {
  answer_quality: 'sufficient' | 'weak' | 'strong';
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

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = (await request.json()) as {
      question_text?: string;
      answer_text?: string;
      question_type?: string;
      competency_tag?: string;
      resume_json?: unknown;
    };

    if (!body.question_text || !body.answer_text || !body.question_type || !body.competency_tag || !body.resume_json) {
      return jsonResponse(
        { error: 'question_text, answer_text, question_type, competency_tag, and resume_json are required' },
        400,
      );
    }

    const prompt = `You are a rigorous technical interviewer evaluating a candidate's answer. Return ONLY valid JSON. No markdown, no backticks.

{
  "answer_quality": "sufficient" | "weak" | "strong",
  "scores": {
    "relevance": 1-5,
    "specificity": 1-5,
    "structure": 1-5,
    "ownership": 1-5,
    "result_clarity": 1-5
  },
  "missing_dimensions": [string],
  "followup_needed": boolean,
  "followup_question": string or null,
  "provisional_critique": string
}

Scoring rubric:
- relevance: does the answer address what was asked (5 = directly answers it, 1 = off-topic)
- specificity: concrete details vs vague generalities (5 = specific names/numbers/events, 1 = all generalities)
- structure: logical flow (5 = clear STAR or equivalent, 1 = rambling)
- ownership: clear individual contribution (5 = clearly states "I did X", 1 = only says "we")
- result_clarity: measurable outcome stated (5 = specific metric, 1 = no outcome mentioned)

followup_needed = true if any score is 3 or below
followup_question must be specific to what was missing, not generic. Reference the candidate's actual project if relevant.

provisional_critique rules - this is the most important field:
- Never say "be more specific" - say exactly what is missing
- Reference the candidate's actual project names from their resume when relevant
- Format: "[What was good]. [What was missing, specifically]. [One sentence on what to add]."
- Example: "You described the overall PantryChef project well, but never stated what you personally built versus your teammates. Add one sentence: 'I owned the backend API and the ingredient matching algorithm.' Then add the outcome: 'That reduced lookup time by 40%.'"

Question: ${body.question_text}
Question type: ${body.question_type}
Competency: ${body.competency_tag}
Candidate resume context: ${JSON.stringify(body.resume_json)}

Candidate's answer:
${body.answer_text}`;

    const parsed = await callGemini<AnswerEvaluation>(prompt);
    return jsonResponse(parsed);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Failed to evaluate answer' }, 500);
  }
});
