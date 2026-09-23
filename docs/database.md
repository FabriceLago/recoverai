# Database

Migrations are in `supabase/migrations/` (apply in filename order).

## Tables

`organizations`, `profiles` (1:1 with `auth.users`), `memberships` (role per org), `opportunities`, `opportunity_signals`, `risk_scores` (history), `recommended_actions`, `revenue_events` (append-only ledger), `email_messages`, `integrations`, `audit_logs`.

Every business table carries `organization_id` (directly, or via `opportunity_id`). RLS is enabled on all of them.

## Enums (CHECK constraints)

- role: `OWNER, ADMIN, MEMBER, VIEWER`
- opportunity status: `NEW, QUALIFIED, PROPOSAL_SENT, NEGOTIATION, WON, LOST, DORMANT`
- risk level: `LOW, MEDIUM, HIGH, CRITICAL`
- action type: `FOLLOW_UP_NOW, FOLLOW_UP_TODAY, FOLLOW_UP_SOON, MONITOR`; status `PENDING, COMPLETED, DISMISSED`
- revenue event: `RECOVERED, WON, LOST`

## Risk score (0-100, capped)

| Factor | Points |
|---|---|
| Days since last contact | up to 3: 0, 4-7: 10, 8-14: 25, 15-21: 40, over 21: 50 |
| Value | under 1000: 5, under 3000: 10, under 10000: 20, else 25 |
| Engagement | no replies: 20, replies but stale: 10, recent reply: 0 |
| Deadline | closing within 7 days (or overdue): +20 |

Levels: 0-29 LOW, 30-59 MEDIUM, 60-79 HIGH, 80-100 CRITICAL.

## Functions and views

`calculate_risk_score`, `calculate_next_best_action`, `sync_opportunity_derivatives` (trigger), `get_dashboard_kpis`, `mark_opportunity_recovered`, `create_organization_with_owner`, and helpers `is_org_member`, `member_role`, `has_role`, `opportunity_org_id`. Views: `opportunity_risk_scores`, `opportunities_with_risk` (both `security_invoker`).

## Tests

pgTAP in `supabase/tests/`: `risk_engine`, `next_best_action`, `revenue_recovered`, `revenue_kpis`, `rls_permissions`.
