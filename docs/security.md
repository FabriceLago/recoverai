# Security

## Multi-tenancy

Each row belongs to one organization. RLS policies check membership through `SECURITY DEFINER` helpers (`is_org_member`, `has_role`) that fix `search_path`, so policies do not recurse and cannot be hijacked.

## Roles (enforced in the database)

| | OWNER | ADMIN | MEMBER | VIEWER |
|---|---|---|---|---|
| Read org data | yes | yes | yes | yes |
| Create/edit opportunities, actions, revenue events | yes | yes | yes | no |
| Remove opportunities | yes | yes | no | no |
| Invite/remove members, manage integrations | yes | yes | no | no |
| Change member roles, rename org | yes | no | no | no |
| Read audit logs | yes | yes | no | no |

`risk_scores`, `opportunity_signals`, `audit_logs` and new `recommended_actions` have no client write policy: they are written by SECURITY DEFINER triggers.

## Never trust the client

The client never sets a role. Organizations are created only through `create_organization_with_owner`. When the client supplies `organization_id` on insert, RLS re-checks the caller's real role in that exact organization, so a tampered value is rejected.

## Secrets

- `OPENAI_API_KEY`, `STRIPE_*` and OAuth secrets are Edge Function secrets only.
- Only the Supabase URL and anon key ship to the browser.
- `.env` and `.env.*` are git-ignored (`.env.example` is committed and empty).
- Edge Functions require a valid user JWT.

## Views

Views use `security_invoker = true`, so they run under the caller's RLS instead of the view owner's.

## Simulation safety

Simulated sends are never delivered. They only write an `email_messages` row with `provider = 'MOCK'`.

## Not yet done

Audit-log writers, rate limiting on the AI function, Stripe webhook verification, and an RLS test pass against the hosted project (the suite already passes on a local database).

## Offensive review (2026-09-23)

Attacks tried and closed (each has a regression test in `supabase/tests/security_attacks.test.sql`):
- Profile takeover: users could re-point `profiles.organization_id` or spoof their email. Now only `full_name`/`avatar_url` are updatable.
- Privilege escalation: an ADMIN could grant OWNER or delete the OWNER. Now restricted, and the last owner is protected by trigger.
- Fabricated revenue: any MEMBER could insert `RECOVERED` events, and the RPC could be replayed. Ledger is RPC-only, closed deals cannot be recovered again.
- Cross-tenant references, column tampering (`opportunities.organization_id`, action text), NULL-role bypass in `has_role`.
- Integration tokens were readable by every member. Token columns are no longer granted to clients.
- `anon` role and PUBLIC had access to tables/functions. Revoked, plus default privileges so future objects stay closed.
- Abuse: per-user AI quota (30/hour), organization cap (5/user), text size limits, CSV import caps (2 MB / 2000 rows).
- App layer: PostgREST filter injection in search, unvalidated checkout redirect, prompt injection and error leakage in the AI function, open `return_url` in checkout.
- Headers: `public/_headers` sets CSP, HSTS, frame and MIME protections (Netlify / Cloudflare Pages format; mirror them on other hosts).
- Auth: minimum password length 8 with letters and digits.

Deploy checklist: apply migration `20260923000002`, redeploy both edge functions, set `ALLOWED_RETURN_ORIGINS` (comma-separated app origins) before enabling billing.
