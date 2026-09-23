// Creates a Stripe Checkout session. STRIPE_SECRET_KEY only ever lives here.
// Returns 503 when Stripe isn't configured so the MVP is never blocked by billing.
//
// Hardening: POST only, bounded body, and return_url must belong to an allowed origin
// (ALLOWED_RETURN_ORIGINS, comma separated) so Stripe can't be used to bounce users
// to an attacker's site. Upstream errors are logged, never echoed.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PLAN_PRICES_EUR_CENTS: Record<string, { name: string; amount: number }> = {
  STARTER: { name: 'RecoverAI Starter', amount: 4900 },
  PRO: { name: 'RecoverAI Pro', amount: 9900 },
  BUSINESS: { name: 'RecoverAI Business', amount: 24900 },
};

const MAX_BODY_CHARS = 2_000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isAllowedReturnUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const allowed = (Deno.env.get('ALLOWED_RETURN_ORIGINS') ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    return (
      allowed.includes(url.origin) && (url.protocol === 'https:' || url.hostname === 'localhost')
    );
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Unauthorized' }, 401);

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return json({ error: 'Billing is not configured for this project yet.' }, 503);

    const raw = await req.text();
    if (raw.length > MAX_BODY_CHARS) return json({ error: 'Request too large' }, 413);

    let payload: { plan_id?: unknown; return_url?: unknown };
    try {
      payload = JSON.parse(raw);
    } catch {
      return json({ error: 'Invalid request' }, 400);
    }

    const plan =
      typeof payload.plan_id === 'string' ? PLAN_PRICES_EUR_CENTS[payload.plan_id] : undefined;
    const returnUrl = payload.return_url;
    if (!plan || typeof returnUrl !== 'string' || !isAllowedReturnUrl(returnUrl)) {
      return json({ error: 'Invalid request' }, 400);
    }

    const form = new URLSearchParams({
      mode: 'subscription',
      success_url: returnUrl,
      cancel_url: returnUrl,
      client_reference_id: userData.user.id,
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': 'eur',
      'line_items[0][price_data][unit_amount]': String(plan.amount),
      'line_items[0][price_data][recurring][interval]': 'month',
      'line_items[0][price_data][product_data][name]': plan.name,
    });

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form,
    });
    if (!response.ok) {
      console.error('stripe error', response.status, await response.text());
      return json({ error: 'Payment provider error' }, 502);
    }

    const session = await response.json();
    return json({ url: session.url });
  } catch (err) {
    console.error('create-checkout-session failed', err instanceof Error ? err.message : err);
    return json({ error: 'Something went wrong' }, 500);
  }
});
