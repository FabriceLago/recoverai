-- Risk Engine tests (§37). Run with `supabase test db` against a live project;
-- rolled back at the end so nothing persists.
begin;
select plan(6);

insert into organizations (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'Test Org', 'test-org');

-- LOW: contacted yesterday, small deal, engaged, deadline far out.
insert into opportunities (
  id, organization_id, company_name, title, value, status,
  last_contact_at, reply_count, expected_close_date
) values (
  '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000001',
  'Acme', 'Website revamp', 500, 'NEW',
  now() - interval '1 day', 5, current_date + 90
);

select is(
  (select calculate_risk_score(o) ->> 'risk_level' from opportunities o where id = '00000000-0000-0000-0000-0000000000a1'),
  'LOW',
  'Recent contact + low value + engaged + far deadline => LOW'
);

-- MEDIUM: 10 days silent, mid value, stale reply, deadline far out.
insert into opportunities (
  id, organization_id, company_name, title, value, status,
  last_contact_at, reply_count, expected_close_date
) values (
  '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000001',
  'Beta Co', 'App redesign', 2000, 'QUALIFIED',
  now() - interval '10 days', 1, current_date + 60
);

select is(
  (select calculate_risk_score(o) ->> 'risk_level' from opportunities o where id = '00000000-0000-0000-0000-0000000000a2'),
  'MEDIUM',
  '10 days silent + mid value + stale reply => MEDIUM'
);

-- HIGH: 5 days silent, high value, no replies, deadline within a week.
insert into opportunities (
  id, organization_id, company_name, title, value, status,
  last_contact_at, reply_count, expected_close_date
) values (
  '00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000001',
  'Gamma Inc', 'SaaS contract', 12000, 'PROPOSAL_SENT',
  now() - interval '5 days', 0, current_date + 5
);

select is(
  (select calculate_risk_score(o) ->> 'risk_level' from opportunities o where id = '00000000-0000-0000-0000-0000000000a3'),
  'HIGH',
  '5 days silent + high value + no replies + closing soon => HIGH'
);

-- CRITICAL + max-100 cap: 25 days silent, very high value, no replies, closing in 3 days.
insert into opportunities (
  id, organization_id, company_name, title, value, status,
  last_contact_at, reply_count, expected_close_date
) values (
  '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-000000000001',
  'Delta LLC', 'Enterprise deal', 20000, 'NEGOTIATION',
  now() - interval '25 days', 0, current_date + 3
);

select is(
  (select (calculate_risk_score(o) ->> 'score')::int from opportunities o where id = '00000000-0000-0000-0000-0000000000a4'),
  100,
  '50+25+20+20=115 raw points caps at 100'
);

select is(
  (select calculate_risk_score(o) ->> 'risk_level' from opportunities o where id = '00000000-0000-0000-0000-0000000000a4'),
  'CRITICAL',
  'Capped score of 100 classifies as CRITICAL'
);

select ok(
  (select jsonb_array_length(calculate_risk_score(o) -> 'explanation') > 0 from opportunities o where id = '00000000-0000-0000-0000-0000000000a4'),
  'CRITICAL opportunity has a non-empty explanation'
);

select * from finish();
rollback;
