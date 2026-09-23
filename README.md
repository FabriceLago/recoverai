# RecoverAI

A B2B **Revenue Recovery Platform**. It answers one question: *of my open opportunities, which are about to be lost, and what should I do now?*

```
Opportunities -> Risk Score -> Revenue at Risk -> Next Best Action -> Follow-up -> Revenue Recovered
```

Not a general-purpose CRM. The product north-star metric is **Revenue Recovered**.

## Architecture

- **Frontend:** Angular (standalone components, signals, reactive forms, SCSS) in `src/`.
- **Backend:** Supabase (PostgreSQL, Auth, Row Level Security, Edge Functions) in `supabase/`.
- **Business logic lives in Postgres** (risk engine, next best action, KPIs, mark recovered): one source of truth. Angular reads data and calls RPCs.
- **AI and Stripe:** server-side Edge Functions only. No secret reaches the browser.
- **Email:** `EmailProvider` abstraction with `MockEmailProvider` (works today) plus Gmail/Outlook stubs.

See [docs/architecture.md](docs/architecture.md).

## Prerequisites

- Node.js 20+ and npm
- A Supabase project (free tier is fine) and the Supabase CLI (`npx supabase` works)
- Optional: an OpenAI key (follow-up generation) and a Stripe key (billing)

## Install and run

```bash
npm install
cp .env.example .env        # fill in values (never commit .env)
npm run dev                 # http://localhost:4200
npm run test                # unit tests (Angular / Vitest)
npm run build               # production build
```

## Environment variables

See `.env.example`.

- Browser-safe: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (put them in `src/environments/environment*.ts`).
- Server-only secrets (Edge Function secrets, never in Angular): `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GOOGLE_*`, `MICROSOFT_*`.

## Supabase setup

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push                                   # applies supabase/migrations/*
npx supabase secrets set OPENAI_API_KEY=... STRIPE_SECRET_KEY=...
npx supabase functions deploy generate-followup
npx supabase functions deploy create-checkout-session
```

### Seed (demo data)

`supabase/seed.sql` creates one organization, four users (OWNER/ADMIN/MEMBER/VIEWER, password `demo-password-123`), 20 opportunities and revenue events. On a local stack, `npx supabase db reset` applies migrations then the seed. All seed data is fictional and tagged as simulation.

### Database tests

`npx supabase test db` runs the pgTAP suites in `supabase/tests/` (risk engine, next best action, revenue, RLS and permissions).

## Using the app

Sign up, then onboarding (create the organization; pick Simulation, CSV import or empty), then the Revenue Radar dashboard. Open an opportunity to see its risk analysis, recommended action and AI-drafted follow-up (simulated send), then **Mark as recovered**.

Simulation mode never sends real email.

## Security

Every business row belongs to an organization and is protected by RLS. Roles (OWNER/ADMIN/MEMBER/VIEWER) are enforced in the database. See [docs/security.md](docs/security.md).

## More docs

[architecture](docs/architecture.md), [database](docs/database.md), [security](docs/security.md), [deployment](docs/deployment.md), [product](docs/product.md)

## Status

Built in phases against a spec. The Angular unit tests run and pass. **The SQL migrations, RLS policies, edge functions and pgTAP tests were written without a live Supabase project and have not been executed yet.** Apply them to a real project and run `supabase test db` before trusting them.
