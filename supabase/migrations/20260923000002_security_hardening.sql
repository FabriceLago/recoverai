-- Security hardening from an offensive review (see supabase/tests/security_attacks.test.sql).
-- Every change below closes an attack that was proven to work before this file.

-- 1. Anonymous visitors get no database access at all -------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;

-- Row security is the only guard for signed-in users, so also strip privileges
-- that bypass it (TRUNCATE) or are never needed from the client role.
revoke truncate, references, trigger on all tables in schema public from authenticated;

-- 2. New functions are closed by default. Postgres grants EXECUTE to PUBLIC (and
-- Supabase to anon) on every new function, so switch that off for future ones;
-- the blanket revoke for existing ones runs at the end of this file, after all
-- functions exist.
alter default privileges revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from public, anon;

-- 2b. has_role must answer true/false, never NULL. A NULL made "not has_role(...)"
-- guards silently pass for users with no role in the organization.
create or replace function has_role(target_org_id uuid, allowed_roles text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(member_role(target_org_id) = any(allowed_roles), false);
$$;

-- 3. Profiles: clients may only edit their own display fields ------------------
-- Previously a user could re-point profiles.organization_id at another tenant and
-- rewrite the email shown in the team roster.
revoke update on profiles from authenticated;
grant update (full_name, avatar_url) on profiles to authenticated;

drop policy profiles_update on profiles;
create policy profiles_update on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

alter table profiles add constraint profiles_text_limits check (
  char_length(coalesce(full_name, '')) <= 200
  and char_length(coalesce(email, '')) <= 320
  and char_length(coalesce(avatar_url, '')) <= 2000
);

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, left(new.raw_user_meta_data ->> 'full_name', 200));
  return new;
end;
$$;

-- 4. Memberships: no privilege escalation, and an organization keeps an owner --
-- Previously an ADMIN could insert an OWNER membership for anyone and remove the
-- OWNER's own membership.
drop policy memberships_insert on memberships;
create policy memberships_insert on memberships
  for insert with check (
    has_role(organization_id, array['OWNER'])
    or (has_role(organization_id, array['ADMIN']) and role in ('MEMBER', 'VIEWER'))
  );

drop policy memberships_delete on memberships;
create policy memberships_delete on memberships
  for delete using (
    has_role(organization_id, array['OWNER'])
    or (has_role(organization_id, array['ADMIN']) and role in ('MEMBER', 'VIEWER'))
    or user_id = auth.uid()
  );

create function protect_last_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only client-originated changes are guarded; cascades from admin tooling pass.
  if auth.uid() is null then
    return coalesce(new, old);
  end if;

  if old.role = 'OWNER'
     and (tg_op = 'DELETE' or new.role <> 'OWNER' or new.organization_id <> old.organization_id) then
    if not exists (
      select 1 from memberships m
      where m.organization_id = old.organization_id and m.role = 'OWNER' and m.id <> old.id
    ) then
      raise exception 'An organization must keep at least one owner';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger memberships_protect_last_owner
  before update or delete on memberships
  for each row execute function protect_last_owner();

-- 5. Revenue ledger: only the audited RPC can write it ---------------------------
-- Previously any MEMBER could insert RECOVERED events with any amount, and the RPC
-- could be replayed on a closed deal to inflate the north-star metric.
drop policy revenue_events_insert on revenue_events;
revoke insert, update, delete on revenue_events from authenticated;

create or replace function mark_opportunity_recovered(target_opportunity_id uuid, recovered_amount numeric)
returns opportunities
language plpgsql
security definer
set search_path = public
as $$
declare
  opp opportunities;
  updated_opportunity opportunities;
begin
  if recovered_amount is null or recovered_amount < 0 then
    raise exception 'Recovered amount must be zero or greater';
  end if;

  select * into opp from opportunities where id = target_opportunity_id;

  if not found or not coalesce(has_role(opp.organization_id, array['OWNER', 'ADMIN', 'MEMBER']), false) then
    raise exception 'Opportunity not found or not accessible';
  end if;

  if opp.status in ('WON', 'LOST') then
    raise exception 'Opportunity is already closed';
  end if;

  update opportunities set status = 'WON' where id = opp.id returning * into updated_opportunity;

  insert into revenue_events (organization_id, opportunity_id, event_type, amount, currency)
  values (updated_opportunity.organization_id, updated_opportunity.id, 'RECOVERED', recovered_amount, updated_opportunity.currency);

  return updated_opportunity;
end;
$$;

-- 6. Cross-tenant references and column tampering --------------------------------
drop policy email_messages_insert on email_messages;
create policy email_messages_insert on email_messages
  for insert with check (
    has_role(organization_id, array['OWNER', 'ADMIN', 'MEMBER'])
    and (opportunity_id is null or opportunity_org_id(opportunity_id) = organization_id)
  );

revoke update on opportunities from authenticated;
grant update (
  company_name, contact_name, contact_email, title, description, value, currency, status,
  source, last_contact_at, expected_close_date, email_count, reply_count, owner_id
) on opportunities to authenticated;

revoke update on recommended_actions from authenticated;
grant update (status, completed_at) on recommended_actions to authenticated;

-- 7. Integration tokens never reach the browser ----------------------------------
-- Previously every org member (even a VIEWER) could read the token columns.
revoke select, insert, update on integrations from authenticated;
grant select (id, organization_id, provider, status, expires_at, metadata, created_at, updated_at)
  on integrations to authenticated;
grant insert (organization_id, provider, status) on integrations to authenticated;
grant update (status) on integrations to authenticated;

-- 8. Size limits: reject abusive payloads at the database ------------------------
alter table organizations add constraint organizations_name_limit
  check (char_length(name) between 1 and 200);

alter table opportunities add constraint opportunities_text_limits check (
  char_length(company_name) <= 200
  and char_length(title) <= 200
  and char_length(coalesce(description, '')) <= 5000
  and char_length(coalesce(contact_name, '')) <= 200
  and char_length(coalesce(contact_email, '')) <= 320
  and char_length(coalesce(source, '')) <= 100
);

alter table email_messages add constraint email_messages_size check (
  char_length(coalesce(subject, '')) <= 500
  and char_length(coalesce(body, '')) <= 20000
);

-- 9. Cap organization creation per user ------------------------------------------
create or replace function create_organization_with_owner(org_name text)
returns organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org organizations;
  base_slug text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if org_name is null or trim(org_name) = '' then
    raise exception 'Organization name is required';
  end if;

  if (select count(*) from memberships where user_id = auth.uid() and role = 'OWNER') >= 5 then
    raise exception 'Organization limit reached';
  end if;

  base_slug := slugify(left(org_name, 60));
  if base_slug = '' then
    base_slug := 'org';
  end if;

  insert into organizations (name, slug)
  values (trim(org_name), base_slug || '-' || substr(md5(gen_random_uuid()::text), 1, 6))
  returning * into new_org;

  insert into memberships (organization_id, user_id, role)
  values (new_org.id, auth.uid(), 'OWNER');

  update profiles set organization_id = new_org.id where id = auth.uid();

  return new_org;
end;
$$;

-- 10. AI cost guard: per-user hourly quota checked by the edge function ----------
create table ai_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index ai_requests_user_created_idx on ai_requests (user_id, created_at desc);

alter table ai_requests enable row level security;
revoke all on ai_requests from authenticated, anon;

create function consume_ai_quota()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  used int;
begin
  if uid is null then
    return false;
  end if;

  select count(*) into used
  from ai_requests
  where user_id = uid and created_at > now() - interval '1 hour';

  if used >= 30 then
    return false;
  end if;

  insert into ai_requests (user_id) values (uid);
  return true;
end;
$$;

-- 11. Close every function, then grant back only what signed-in users call -------
revoke execute on all functions in schema public from public, anon;

-- Granting back to signed-in users only: ---------------------
grant execute on function
  is_org_member(uuid),
  member_role(uuid),
  has_role(uuid, text[]),
  opportunity_org_id(uuid),
  slugify(text),
  calculate_risk_score(opportunities),
  get_dashboard_kpis(),
  mark_opportunity_recovered(uuid, numeric),
  create_organization_with_owner(text),
  consume_ai_quota()
to authenticated;
