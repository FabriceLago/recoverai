-- RLS + role permission tests (§37). Run with `supabase test db`; rolled back.
-- Fixtures are created as superuser (bypasses RLS), then each assertion runs as
-- an `authenticated` user with a spoofed JWT subject.
begin;
select plan(11);

-- Users: a1=OWNER, a2=ADMIN, a3=MEMBER, a4=VIEWER (org A); b1=OWNER of org B.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@a.test'),
  ('00000000-0000-0000-0000-0000000000a2', 'admin@a.test'),
  ('00000000-0000-0000-0000-0000000000a3', 'member@a.test'),
  ('00000000-0000-0000-0000-0000000000a4', 'viewer@a.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner@b.test');

insert into organizations (id, name, slug) values
  ('00000000-0000-0000-0000-00000000000a', 'Org A', 'org-a'),
  ('00000000-0000-0000-0000-00000000000b', 'Org B', 'org-b');

insert into memberships (organization_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'OWNER'),
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a2', 'ADMIN'),
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a3', 'MEMBER'),
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a4', 'VIEWER'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'OWNER');

insert into opportunities (id, organization_id, company_name, title, value) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-00000000000a', 'Acme', 'Deal A1', 1000),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-00000000000a', 'Acme', 'Deal A2', 2000);

-- Cross-tenant isolation: org B's owner sees none of org A's data.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1"}', true);

select is((select count(*)::int from opportunities), 0, 'org B owner cannot read org A opportunities');
select is((select count(*)::int from organizations), 1, 'org B owner only sees their own organization');
select throws_ok(
  $$insert into opportunities (organization_id, company_name, title) values ('00000000-0000-0000-0000-00000000000a', 'Evil', 'Injected')$$,
  '42501', null, 'org B owner cannot insert into org A'
);

-- OWNER of org A reads everything in their org.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1"}', true);
select is((select count(*)::int from opportunities), 2, 'org A owner sees both opportunities');

-- VIEWER: read-only.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a4"}', true);
select is((select count(*)::int from opportunities), 2, 'viewer can read opportunities');
select throws_ok(
  $$insert into opportunities (organization_id, company_name, title) values ('00000000-0000-0000-0000-00000000000a', 'V', 'Viewer write')$$,
  '42501', null, 'viewer cannot create opportunities'
);

-- MEMBER: can create, cannot remove opportunities or rename the org.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3"}', true);
select lives_ok(
  $$insert into opportunities (organization_id, company_name, title) values ('00000000-0000-0000-0000-00000000000a', 'M', 'Member write')$$,
  'member can create opportunities'
);
delete from opportunities where id = '00000000-0000-0000-0000-0000000000d1';
update organizations set name = 'Hacked' where id = '00000000-0000-0000-0000-00000000000a';

-- ADMIN: can remove opportunities.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2"}', true);
delete from opportunities where id = '00000000-0000-0000-0000-0000000000d2';

-- Verify outcomes as superuser (RLS-filtered writes silently affect 0 rows).
reset role;
select is(
  (select count(*)::int from opportunities where id = '00000000-0000-0000-0000-0000000000d1'), 1,
  'member removal was blocked (row still exists)'
);
select is(
  (select name from organizations where id = '00000000-0000-0000-0000-00000000000a'), 'Org A',
  'member cannot rename the organization'
);
select is(
  (select count(*)::int from opportunities where id = '00000000-0000-0000-0000-0000000000d2'), 0,
  'admin removal succeeded'
);

select * from finish();
rollback;
