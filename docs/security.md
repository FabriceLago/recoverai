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

Audit-log writers, rate limiting on the AI function, Stripe webhook verification, and an execution pass of the RLS test suite on a live database.
