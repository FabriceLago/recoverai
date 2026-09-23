-- Guardrails against forgetting to protect future objects. These inspect privileges,
-- so a new table or function that anonymous visitors can reach fails the suite.
begin;
select plan(5);

select is(
  (select count(*)::int
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind in ('r', 'v', 'm', 'p')
     and has_table_privilege('anon', c.oid, 'select,insert,update,delete')),
  0,
  'anonymous role has no privilege on any public table or view'
);

select is(
  (select array_agg(p.proname order by p.proname)::text
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prokind = 'f'
     and has_function_privilege('anon', p.oid, 'execute')
     and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')),
  null,
  'anonymous role can execute no application function'
);

select is(
  (select count(*)::int
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind in ('r', 'p')
     and has_table_privilege('authenticated', c.oid, 'truncate')),
  0,
  'signed-in users cannot TRUNCATE (it would bypass row security)'
);

select is(
  (select count(*)::int
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind = 'r'
     and not c.relrowsecurity),
  0,
  'every public table has row level security enabled'
);

-- An organization can never lose its last owner through a client request.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000006a1', 'sole@owner.test');
insert into organizations (id, name, slug) values ('00000000-0000-0000-0000-00000000060a', 'Sole Owner Org', 'sole-owner');
insert into memberships (organization_id, user_id, role)
values ('00000000-0000-0000-0000-00000000060a', '00000000-0000-0000-0000-0000000006a1', 'OWNER');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000006a1"}', true);

select throws_ok(
  $$update memberships set role = 'ADMIN' where user_id = '00000000-0000-0000-0000-0000000006a1'$$,
  null, 'An organization must keep at least one owner',
  'the last owner cannot demote themselves'
);

reset role;
select * from finish();
rollback;
