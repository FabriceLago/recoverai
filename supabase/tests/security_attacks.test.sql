-- Offensive security tests. Each assertion describes the SECURE outcome of an
-- attack a malicious user could try; a failing assertion is a live vulnerability.
-- Run with `supabase test db`. Rolled back at the end.
begin;
select plan(19);

-- Org A: s1 OWNER, s2 ADMIN, s3 MEMBER, s4 VIEWER. Org B: s5 OWNER.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000005a1', 'owner@a.sec'),
  ('00000000-0000-0000-0000-0000000005a2', 'admin@a.sec'),
  ('00000000-0000-0000-0000-0000000005a3', 'member@a.sec'),
  ('00000000-0000-0000-0000-0000000005a4', 'viewer@a.sec'),
  ('00000000-0000-0000-0000-0000000005b1', 'owner@b.sec');

insert into organizations (id, name, slug) values
  ('00000000-0000-0000-0000-00000000050a', 'Org A', 'sec-a'),
  ('00000000-0000-0000-0000-00000000050b', 'Org B', 'sec-b');

insert into memberships (organization_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000050a', '00000000-0000-0000-0000-0000000005a1', 'OWNER'),
  ('00000000-0000-0000-0000-00000000050a', '00000000-0000-0000-0000-0000000005a2', 'ADMIN'),
  ('00000000-0000-0000-0000-00000000050a', '00000000-0000-0000-0000-0000000005a3', 'MEMBER'),
  ('00000000-0000-0000-0000-00000000050a', '00000000-0000-0000-0000-0000000005a4', 'VIEWER'),
  ('00000000-0000-0000-0000-00000000050b', '00000000-0000-0000-0000-0000000005b1', 'OWNER');

insert into opportunities (id, organization_id, company_name, title, value) values
  ('00000000-0000-0000-0000-0000000005d1', '00000000-0000-0000-0000-00000000050a', 'Acme', 'Deal A', 1000),
  ('00000000-0000-0000-0000-0000000005d2', '00000000-0000-0000-0000-00000000050b', 'Rival', 'Deal B', 9000);

insert into integrations (organization_id, provider, status, access_token_encrypted)
values ('00000000-0000-0000-0000-00000000050a', 'GMAIL', 'CONNECTED', 'SECRET-TOKEN');

-- ADMIN attacks
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000005a2"}', true);

select throws_ok(
  $$insert into memberships (organization_id, user_id, role) values ('00000000-0000-0000-0000-00000000050a', '00000000-0000-0000-0000-0000000005b1', 'OWNER')$$,
  '42501', null, 'ADMIN cannot grant OWNER to someone'
);

delete from memberships where user_id = '00000000-0000-0000-0000-0000000005a1';

-- MEMBER attacks
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000005a3"}', true);

select throws_ok(
  $$update profiles set organization_id = '00000000-0000-0000-0000-00000000050b' where id = '00000000-0000-0000-0000-0000000005a3'$$,
  '42501', null, 'user cannot re-point their profile at another organization'
);
select throws_ok(
  $$update profiles set email = 'ceo@victim.example' where id = '00000000-0000-0000-0000-0000000005a3'$$,
  '42501', null, 'user cannot spoof the email shown in the team roster'
);
select throws_ok(
  $$insert into revenue_events (organization_id, opportunity_id, event_type, amount) values ('00000000-0000-0000-0000-00000000050a', '00000000-0000-0000-0000-0000000005d1', 'RECOVERED', 999999)$$,
  '42501', null, 'member cannot fabricate recovered revenue'
);
select throws_ok(
  $$insert into email_messages (organization_id, opportunity_id, direction, subject) values ('00000000-0000-0000-0000-00000000050a', '00000000-0000-0000-0000-0000000005d2', 'OUTBOUND', 'x')$$,
  '42501', null, 'member cannot attach an email to another tenant opportunity'
);
select throws_ok(
  $$update opportunities set organization_id = '00000000-0000-0000-0000-00000000050b' where id = '00000000-0000-0000-0000-0000000005d1'$$,
  '42501', null, 'member cannot move an opportunity to another organization'
);
select throws_ok(
  $$update recommended_actions set title = 'Wire money to attacker' where opportunity_id = '00000000-0000-0000-0000-0000000005d1'$$,
  '42501', null, 'member cannot rewrite the text of a recommended action'
);
select throws_ok(
  $$select mark_opportunity_recovered('00000000-0000-0000-0000-0000000005d2', 5000)$$,
  null, null, 'member cannot mark another tenant opportunity as recovered'
);
select lives_ok(
  $$select mark_opportunity_recovered('00000000-0000-0000-0000-0000000005d1', 1000)$$,
  'member can recover their own open opportunity'
);
select throws_ok(
  $$select mark_opportunity_recovered('00000000-0000-0000-0000-0000000005d1', 1000)$$,
  null, null, 'a closed opportunity cannot be recovered twice (no revenue inflation)'
);

-- VIEWER attacks
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000005a4"}', true);

select throws_ok(
  $$select access_token_encrypted from integrations$$,
  '42501', null, 'viewer cannot read integration tokens'
);
select lives_ok($$select status from integrations$$, 'viewer can still see integration status');

-- Abuse and resource exhaustion
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000005a3"}', true);

select throws_ok(
  $$insert into opportunities (organization_id, company_name, title) values ('00000000-0000-0000-0000-00000000050a', repeat('x', 5000), 't')$$,
  '23514', null, 'oversized text is rejected'
);
select lives_ok(
  $$select create_organization_with_owner('Spam ' || g) from generate_series(1, 5) g$$,
  'a user can create a handful of organizations'
);
select throws_ok(
  $$select create_organization_with_owner('One too many')$$,
  null, null, 'organization creation is capped per user'
);
select ok(
  (select bool_and(consume_ai_quota()) from generate_series(1, 30)),
  'AI quota allows a normal amount of drafts'
);
select is(consume_ai_quota(), false, 'AI quota blocks cost abuse after the limit');

-- Anonymous visitor
reset role;
set local role anon;
select set_config('request.jwt.claims', '{}', true);

select throws_ok(
  $$select count(*) from opportunities$$,
  '42501', null, 'anonymous visitors have no table access'
);

reset role;

select is(
  (select count(*)::int from memberships where user_id = '00000000-0000-0000-0000-0000000005a1'), 1,
  'ADMIN cannot remove the OWNER'
);

select * from finish();
rollback;
