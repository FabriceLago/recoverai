-- Revenue Radar: dashboard KPIs and a convenience view joining opportunities
-- with their live risk score, for panels that need to sort/filter by risk.

create view opportunities_with_risk
with (security_invoker = true) as
select
  o.*,
  r.score as risk_score,
  r.risk_level,
  r.explanation as risk_explanation
from opportunities o
join opportunity_risk_scores r on r.opportunity_id = o.id;

-- SECURITY INVOKER (the default for functions without SECURITY DEFINER): every
-- subquery below runs under the caller's RLS, so this naturally scopes to
-- whichever organizations the caller belongs to without needing an org_id arg.
create function get_dashboard_kpis()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'revenue_pipeline', coalesce((
      select sum(value) from opportunities
      where status not in ('WON', 'LOST')
    ), 0),
    'revenue_at_risk', coalesce((
      select sum(o.value)
      from opportunities o
      join opportunity_risk_scores r on r.opportunity_id = o.id
      where o.status not in ('WON', 'LOST')
        and r.risk_level in ('HIGH', 'CRITICAL')
    ), 0),
    'actions_today', coalesce((
      select count(*)
      from recommended_actions
      where status = 'PENDING'
        and action_type in ('FOLLOW_UP_NOW', 'FOLLOW_UP_TODAY')
    ), 0),
    'revenue_recovered', coalesce((
      select sum(amount) from revenue_events where event_type = 'RECOVERED'
    ), 0)
  );
$$;

revoke execute on function get_dashboard_kpis() from public;
grant execute on function get_dashboard_kpis() to authenticated;
