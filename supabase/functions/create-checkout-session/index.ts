// Creates a Stripe Checkout session. STRIPE_SECRET_KEY only ever lives here.
// Returns 503 when Stripe isn't configured so the MVP is never blocked by billing.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLAN_PRICES_EUR_CENTS: Record<string, { name: string; amount: number }> = {
  STARTER: { name: 'RecoverAI Starter', amount: 4900 },
  PRO: { name: 'RecoverAI Pro', amount: 9900 },
  BUSINESS: { name: 'RecoverAI Business', amount: 24900 },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Unauthorized' }, 401);

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return json({ error: 'Billing is not configured for this project yet.' }, 503);

    const { plan_id, return_url } = await req.json();
    const plan = PLAN_PRICES_EUR_CENTS[plan_id];
    if (!plan || typeof return_url !== 'string') return json({ error: 'Invalid request' }, 400);

    const form = new URLSearchParams({
      mode: 'subscription',
      success_url: return_url,
      cancel_url: return_url,
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
    if (!response.ok) return json({ error: `Stripe error: ${await response.text()}` }, 502);

    const session = await response.json();
    return json({ url: session.url });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});
