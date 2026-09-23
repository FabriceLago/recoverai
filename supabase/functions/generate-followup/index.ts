// Supabase Edge Function: generates a short, personalized follow-up email.
// OPENAI_API_KEY only ever lives here — never sent to the client (see §17, §28).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateFollowupRequest {
  language?: 'en' | 'fr';
  opportunity: {
    company_name: string;
    contact_name: string | null;
    title: string;
    value: number;
    currency: string;
    status: string;
    email_count: number;
    reply_count: number;
    last_contact_at: string | null;
    expected_close_date: string | null;
  };
  recommended_action: {
    action_type: string;
    reason: string | null;
  } | null;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing Authorization header' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const { opportunity, recommended_action, language }: GenerateFollowupRequest = await req.json();
    const languageName = language === 'fr' ? 'French' : 'English';
    if (!opportunity?.company_name || !opportunity?.title) {
      return jsonResponse({ error: 'Missing opportunity details' }, 400);
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return jsonResponse({ error: 'AI is not configured for this project.' }, 503);
    }

    // ponytail: no per-opportunity language field yet, so this defaults to
    // English; add real language detection/storage when non-English clients
    // are a real need (see §17 "langue du client").
    const facts = [
      `Company: ${opportunity.company_name}`,
      opportunity.contact_name ? `Contact: ${opportunity.contact_name}` : null,
      `Opportunity: ${opportunity.title}`,
      `Value: ${opportunity.value} ${opportunity.currency}`,
      `Status: ${opportunity.status}`,
      `Emails sent so far: ${opportunity.email_count}`,
      `Replies received: ${opportunity.reply_count}`,
      opportunity.last_contact_at
        ? `Last contact: ${opportunity.last_contact_at}`
        : 'No prior contact recorded',
      opportunity.expected_close_date
        ? `Expected close date: ${opportunity.expected_close_date}`
        : null,
      recommended_action?.reason ? `Why this is a priority: ${recommended_action.reason}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const systemPrompt = [
      'You write short, professional follow-up sales emails for a revenue-recovery tool.',
      'Rules:',
      '- Keep it short and natural, not pushy or salesy.',
      '- Use only the facts given below. Never invent details, numbers, or prior conversations that were not provided.',
      `- Write the email in ${languageName}.`,
      '- End with one clear call to action.',
      '- Return strict JSON: {"subject": string, "body": string}. No markdown, no extra keys.',
    ].join('\n');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        temperature: 0.6,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Facts:\n${facts}` },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return jsonResponse({ error: `AI generation failed: ${detail}` }, 502);
    }

    const completion = await response.json();
    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      return jsonResponse({ error: 'AI returned an empty response.' }, 502);
    }

    const parsed = JSON.parse(content);
    if (typeof parsed.subject !== 'string' || typeof parsed.body !== 'string') {
      return jsonResponse({ error: 'AI returned an unexpected format.' }, 502);
    }

    return jsonResponse({ subject: parsed.subject, body: parsed.body });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});
