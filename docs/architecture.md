# Architecture

## Layers

| Layer | Tech | Responsibility |
|---|---|---|
| UI | Angular standalone components + signals | Rendering, forms, routing, guards |
| Data | Supabase PostgREST + RPC | CRUD through RLS; RPCs for business logic |
| Logic | PL/pgSQL functions and triggers | Risk score, next best action, KPIs, mark-recovered |
| Secrets | Supabase Edge Functions (Deno) | OpenAI, Stripe: keys never leave the server |

## Why logic lives in Postgres

Scoring rules are deterministic and must be identical everywhere. One SQL implementation is used by the trigger (history), the live view (always-current values) and the dashboard, so there is no client/server drift.

## Data flow

1. A write to `opportunities` fires `sync_opportunity_derivatives()` (SECURITY DEFINER). It snapshots `risk_scores` and upserts one PENDING `recommended_actions` row.
2. Reads use `opportunity_risk_scores` / `opportunities_with_risk` (security_invoker views), so scores are never stale and RLS still applies.
3. `get_dashboard_kpis()` aggregates Pipeline, Revenue at Risk, Actions Today and Revenue Recovered under the caller's RLS.
4. `mark_opportunity_recovered()` atomically closes the deal as WON and logs a RECOVERED revenue event.

## Frontend layout (`src/app/`)

`core/` (auth, guards, org, toast, shell), `auth/`, `onboarding/`, `landing/`, `dashboard/`, `opportunities/`, `actions/`, `import/` (CSV and simulation), `integrations/` (EmailProvider), `billing/`, `settings/`, `shared/` (badges, KPI card).

Routes are lazy-loaded. `authGuard` requires a session, `orgGuard` requires an organization (otherwise onboarding), and `guestGuard` keeps signed-in users off the auth pages.

## Email providers

`EmailProvider` has three implementations: `MockEmailProvider` (default, always connected), `GmailProvider` and `OutlookProvider` (stubs that fail clearly until OAuth credentials and an Edge Function exist). The MVP never depends on the real ones.

## Known simplifications

- KPI sums ignore currency (assumes one currency per organization).
- Engagement scoring uses `last_contact_at` as a proxy for reply recency (there is no `last_reply_at` column).
- The AI prompt language defaults to English.
