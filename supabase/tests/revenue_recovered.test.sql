-- Revenue Recovered tests (§25): the NBA closed-status fix and the atomic
-- mark_opportunity_recovered RPC. Run with `supabase test db`; rolled back at
-- the end so nothing persists.
begin;
select plan(4);

insert into organizations (id, name, slug)
values ('00000000-0000-0000-0000-000000000003', 'Revenue Test Org', 'revenue-test-org');

-- A WON opportunity should never surface "follow up" actions, even if its
-- risk factors (long silence, high value) would otherwise score CRITICAL.
insert into opportunities (
  id, organization_id, company_name, title, value, status,
  last_contact_at, reply_count, expected_close_date
) values (
  '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000003',
  'Won Co', 'Closed deal', 20000, 'WON',
  now() - interval '30 days', 0, current_date - 5
);

select is(
  (select action_type from recommended_actions where opportunity_id = '00000000-0000-0000-0000-0000000000c1' and status = 'PENDING'),
  'MONITOR',
  'WON opportunity gets MONITOR regardless of risk factors'
);

select is(
  (select title from recommended_actions where opportunity_id = '00000000-0000-0000-0000-0000000000c1' and status = 'PENDING'),
  'No action needed',
  'WON opportunity action is labeled "No action needed"'
);

-- mark_opportunity_recovered: atomic status change + revenue event.
insert into opportunities (
  id, organization_id, company_name, title, value, currency, status,
  last_contact_at, reply_count, expected_close_date
) values (
  '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000003',
  'Recoverable Co', 'At-risk deal', 7500, 'EUR', 'NEGOTIATION',
  now() - interval '20 days', 0, current_date + 3
);

-- The RPC checks the caller's role, so run it as a real organization member.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c9', 'recover@test');
insert into memberships (organization_id, user_id, role)
values ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000c9', 'OWNER');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c9"}', true);
select mark_opportunity_recovered('00000000-0000-0000-0000-0000000000c2', 7500);
reset role;

select is(
  (select status from opportunities where id = '00000000-0000-0000-0000-0000000000c2'),
  'WON',
  'mark_opportunity_recovered closes the opportunity as WON'
);

select is(
  (select amount from revenue_events where opportunity_id = '00000000-0000-0000-0000-0000000000c2' and event_type = 'RECOVERED'),
  7500::numeric,
  'mark_opportunity_recovered logs a RECOVERED revenue event with the given amount'
);

select * from finish();
rollback;
