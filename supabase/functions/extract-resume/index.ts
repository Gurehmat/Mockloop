import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { callGemini, corsHeaders, jsonResponse } from '../_shared/gemini.ts';

interface ParsedResume {
  education: { institution: string; degree: string; grad_year: string }[];
  experience: { company: string; role: string; duration: string; bullets: string[] }[];
  projects: {
    name: string;
    technologies: string[];
    what_was_built: string;
    individual_contribution: string;
    measurable_outcome: string;
    difficulty_signals: string[];
    story_categories: ('challenge' | 'teamwork' | 'failure' | 'leadership' | 'initiative')[];
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

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const { resume_text } = (await request.json()) as { resume_text?: string };

    if (!resume_text?.trim()) {
      return jsonResponse({ error: 'resume_text is required' }, 400);
    }

    const prompt = `You are extracting structured data from a resume. Return ONLY valid JSON. No markdown, no backticks, no explanation, no preamble.

Return exactly this schema:
{
  "education": [{ "institution": string, "degree": string, "grad_year": string }],
  "experience": [{ "company": string, "role": string, "duration": string, "bullets": [string] }],
  "projects": [
    {
      "name": string,
      "technologies": [string],
      "what_was_built": string,
      "individual_contribution": string,
      "measurable_outcome": string,
      "difficulty_signals": [string],
      "story_categories": array of any from ["challenge","teamwork","failure","leadership","initiative"]
    }
  ],
  "story_bank": {
    "challenge": { "source": string, "summary": string } or null,
    "teamwork": { "source": string, "summary": string } or null,
    "failure": { "source": string, "summary": string } or null,
    "leadership": { "source": string, "summary": string } or null,
    "initiative": { "source": string, "summary": string } or null
  },
  "weak_spots": [string],
  "likely_probes": [string]
}

Rules:
- weak_spots must be specific. Not "lacks detail" but "PantryChef project has no stated individual contribution or measurable outcome."
- likely_probes are exact questions a real interviewer would ask based on what is listed.
- If a story category has no clear match, set it to null.
- individual_contribution must describe what this person specifically did, not what the team did.

Resume:
${resume_text}`;

    const parsed = await callGemini<ParsedResume>(prompt);
    return jsonResponse(parsed);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Failed to extract resume' }, 500);
  }
});
