-- Revenue tests (§37): Pipeline, Revenue at Risk, Revenue Recovered via
-- get_dashboard_kpis(), which runs as the caller (RLS-scoped).
begin;
select plan(3);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000e1', 'kpi@test');
insert into organizations (id, name, slug) values ('00000000-0000-0000-0000-00000000000e', 'KPI Org', 'kpi-org');
insert into memberships (organization_id, user_id, role)
values ('00000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-0000000000e1', 'OWNER');

-- Open + critical (25d silent, no replies, closing in 3d): counts in pipeline AND at risk.
insert into opportunities (organization_id, company_name, title, value, status, last_contact_at, reply_count, expected_close_date)
values ('00000000-0000-0000-0000-00000000000e', 'Risky', 'At risk', 20000, 'NEGOTIATION', now() - interval '25 days', 0, current_date + 3);
-- Open + healthy: pipeline only.
insert into opportunities (organization_id, company_name, title, value, status, last_contact_at, reply_count, expected_close_date)
values ('00000000-0000-0000-0000-00000000000e', 'Healthy', 'Fine', 500, 'NEW', now() - interval '1 day', 5, current_date + 90);
-- Closed WON: excluded from pipeline and at-risk.
insert into opportunities (organization_id, company_name, title, value, status, last_contact_at, reply_count, expected_close_date)
values ('00000000-0000-0000-0000-00000000000e', 'Won', 'Done', 9000, 'WON', now() - interval '40 days', 0, current_date - 5);

insert into revenue_events (organization_id, opportunity_id, event_type, amount)
select organization_id, id, 'RECOVERED', 7500 from opportunities where company_name = 'Won';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1"}', true);

select is((get_dashboard_kpis() ->> 'revenue_pipeline')::numeric, 20500::numeric, 'pipeline = open deals only (20000 + 500)');
select is((get_dashboard_kpis() ->> 'revenue_at_risk')::numeric, 20000::numeric, 'revenue at risk = HIGH/CRITICAL open deals only');
select is((get_dashboard_kpis() ->> 'revenue_recovered')::numeric, 7500::numeric, 'revenue recovered sums RECOVERED events');

reset role;
select * from finish();
rollback;
