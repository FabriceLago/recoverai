-- Next Best Action engine tests (§16). Run with `supabase test db`; rolled
-- back at the end so nothing persists. Reuses the same 4 risk scenarios as
-- risk_engine.test.sql since each risk level maps to exactly one action type.
begin;
select plan(4);

insert into organizations (id, name, slug)
values ('00000000-0000-0000-0000-000000000002', 'NBA Test Org', 'nba-test-org');

-- LOW risk => MONITOR
insert into opportunities (
  id, organization_id, company_name, title, value, status,
  last_contact_at, reply_count, expected_close_date
) values (
  '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000002',
  'Acme', 'Website revamp', 500, 'NEW',
  now() - interval '1 day', 5, current_date + 90
);

select is(
  (select action_type from recommended_actions where opportunity_id = '00000000-0000-0000-0000-0000000000b1' and status = 'PENDING'),
  'MONITOR',
  'LOW risk opportunity gets MONITOR'
);

-- MEDIUM risk => FOLLOW_UP_SOON
insert into opportunities (
  id, organization_id, company_name, title, value, status,
  last_contact_at, reply_count, expected_close_date
) values (
  '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000002',
  'Beta Co', 'App redesign', 2000, 'QUALIFIED',
  now() - interval '10 days', 1, current_date + 60
);

select is(
  (select action_type from recommended_actions where opportunity_id = '00000000-0000-0000-0000-0000000000b2' and status = 'PENDING'),
  'FOLLOW_UP_SOON',
  'MEDIUM risk opportunity gets FOLLOW_UP_SOON'
);

-- HIGH risk + closing within 7 days => FOLLOW_UP_TODAY
insert into opportunities (
  id, organization_id, company_name, title, value, status,
  last_contact_at, reply_count, expected_close_date
) values (
  '00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-000000000002',
  'Gamma Inc', 'SaaS contract', 12000, 'PROPOSAL_SENT',
  now() - interval '5 days', 0, current_date + 5
);

select is(
  (select action_type from recommended_actions where opportunity_id = '00000000-0000-0000-0000-0000000000b3' and status = 'PENDING'),
  'FOLLOW_UP_TODAY',
  'HIGH risk + closing soon gets FOLLOW_UP_TODAY'
);

-- CRITICAL risk => FOLLOW_UP_NOW
insert into opportunities (
  id, organization_id, company_name, title, value, status,
  last_contact_at, reply_count, expected_close_date
) values (
  '00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-000000000002',
  'Delta LLC', 'Enterprise deal', 20000, 'NEGOTIATION',
  now() - interval '25 days', 0, current_date + 3
);

select is(
  (select action_type from recommended_actions where opportunity_id = '00000000-0000-0000-0000-0000000000b4' and status = 'PENDING'),
  'FOLLOW_UP_NOW',
  'CRITICAL risk opportunity gets FOLLOW_UP_NOW'
);

select * from finish();
rollback;
