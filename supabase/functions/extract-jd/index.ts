import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { callGemini, corsHeaders, jsonResponse } from '../_shared/gemini.ts';

interface ParsedJD {
  role_title: string;
  required_skills: string[];
  preferred_skills: string[];
  behavioral_traits_implied: string[];
  technical_expectations: string[];
  likely_question_topics: string[];
}

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const { jd_text } = (await request.json()) as { jd_text?: string };

    if (!jd_text?.trim()) {
      return jsonResponse({ error: 'jd_text is required' }, 400);
    }

    const prompt = `Extract structured data from this job description. Return ONLY valid JSON. No markdown, no backticks, no preamble.

{
  "role_title": string,
  "required_skills": [string],
  "preferred_skills": [string],
  "behavioral_traits_implied": [string],
  "technical_expectations": [string],
  "likely_question_topics": [string]
}

Rules:
- behavioral_traits_implied: infer from verbs in responsibilities (e.g. "collaborate across teams" -> teamwork, "drive initiatives" -> leadership)
- likely_question_topics: specific topics an interviewer at this company would cover based on the JD
- Be specific, not generic

Job description:
${jd_text}`;

    const parsed = await callGemini<ParsedJD>(prompt);
    return jsonResponse(parsed);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Failed to extract job description' }, 500);
  }
});
