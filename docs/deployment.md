# Deployment

## 1. Supabase

1. Create a project and note the URL and anon key.
2. `npx supabase link --project-ref <ref>`
3. `npx supabase db push` (applies all migrations).
4. Optional demo data: run `supabase/seed.sql` in the SQL editor (fictional data).
5. Secrets: `npx supabase secrets set OPENAI_API_KEY=... STRIPE_SECRET_KEY=...`
6. Deploy the functions `generate-followup` and `create-checkout-session`.
7. Auth: set the Site URL and redirect URLs to your frontend (password reset returns to `/reset-password`).

## 2. Frontend

Put the Supabase URL and anon key into `src/environments/environment.ts` (production). They are public by design. Then:

```bash
npm ci
npm run build          # output: dist/recoverai
```

Host `dist/recoverai/browser` on any static host with an SPA fallback (every route serves `index.html`).

## 3. Checklist

- [ ] Migrations applied and `supabase test db` green
- [ ] Anon key in the frontend; no service-role key anywhere in the frontend
- [ ] `.env` not committed
- [ ] Email confirmation and SMTP configured in Supabase Auth
- [ ] OpenAI and Stripe secrets set (or those features left off)
- [ ] Gmail/Outlook left disconnected unless OAuth is configured

## Integrations later

Gmail and Outlook need OAuth credentials plus an Edge Function that stores encrypted tokens in `integrations`. Stripe needs a webhook function that verifies `STRIPE_WEBHOOK_SECRET`.
