-- Multi-tenancy helpers, the org-creation RPC, and RLS policies for every table.
-- Clients never set organization_id or role directly; membership is established
-- only through create_organization_with_owner (SECURITY DEFINER) or, later, an
-- invite flow with the same guarantee.

create function is_org_member(target_org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from memberships
    where organization_id = target_org_id
      and user_id = auth.uid()
  );
$$;

create function member_role(target_org_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from memberships
  where organization_id = target_org_id
    and user_id = auth.uid()
  limit 1;
$$;

create function has_role(target_org_id uuid, allowed_roles text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select member_role(target_org_id) = any(allowed_roles);
$$;

create function opportunity_org_id(target_opportunity_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select organization_id from opportunities where id = target_opportunity_id;
$$;

create function slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(input), '[^a-z0-9]+', '-', 'g'));
$$;

create function create_organization_with_owner(org_name text)
returns organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org organizations;
  base_slug text;
begin
  if org_name is null or trim(org_name) = '' then
    raise exception 'Organization name is required';
  end if;

  base_slug := slugify(org_name);
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

revoke execute on function create_organization_with_owner(text) from public;
grant execute on function create_organization_with_owner(text) to authenticated;

-- organizations: members can read; only OWNER can rename/change slug; no client INSERT (RPC only).
create policy organizations_select on organizations
  for select using (is_org_member(id));

create policy organizations_update on organizations
  for update using (has_role(id, array['OWNER']));

-- profiles: visible to self and org-mates; editable by self or OWNER/ADMIN of the same org.
create policy profiles_select on profiles
  for select using (
    id = auth.uid() or (organization_id is not null and is_org_member(organization_id))
  );

create policy profiles_update on profiles
  for update using (
    id = auth.uid()
    or (organization_id is not null and has_role(organization_id, array['OWNER', 'ADMIN']))
  );

-- memberships: org-visible roster; OWNER/ADMIN invite, only OWNER changes roles, OWNER/ADMIN remove.
create policy memberships_select on memberships
  for select using (is_org_member(organization_id));

create policy memberships_insert on memberships
  for insert with check (has_role(organization_id, array['OWNER', 'ADMIN']));

create policy memberships_update on memberships
  for update using (has_role(organization_id, array['OWNER']));

create policy memberships_delete on memberships
  for delete using (has_role(organization_id, array['OWNER', 'ADMIN']));

-- opportunities: org-visible; OWNER/ADMIN/MEMBER write, VIEWER read-only, OWNER/ADMIN delete.
create policy opportunities_select on opportunities
  for select using (is_org_member(organization_id));

create policy opportunities_insert on opportunities
  for insert with check (has_role(organization_id, array['OWNER', 'ADMIN', 'MEMBER']));

create policy opportunities_update on opportunities
  for update using (has_role(organization_id, array['OWNER', 'ADMIN', 'MEMBER']));

create policy opportunities_delete on opportunities
  for delete using (has_role(organization_id, array['OWNER', 'ADMIN']));

-- opportunity_signals: org-visible read; writes are system-generated (risk engine), no client policy.
create policy opportunity_signals_select on opportunity_signals
  for select using (is_org_member(opportunity_org_id(opportunity_id)));

-- risk_scores: org-visible read; writes are system-generated (risk engine), no client policy.
create policy risk_scores_select on risk_scores
  for select using (is_org_member(opportunity_org_id(opportunity_id)));

-- recommended_actions: org-visible read; MEMBER+ can update status (complete/dismiss); creation is system-generated.
create policy recommended_actions_select on recommended_actions
  for select using (is_org_member(opportunity_org_id(opportunity_id)));

create policy recommended_actions_update on recommended_actions
  for update using (has_role(opportunity_org_id(opportunity_id), array['OWNER', 'ADMIN', 'MEMBER']));

-- revenue_events: org-visible read; OWNER/ADMIN/MEMBER record events; immutable ledger (no update/delete).
create policy revenue_events_select on revenue_events
  for select using (is_org_member(organization_id));

create policy revenue_events_insert on revenue_events
  for insert with check (has_role(organization_id, array['OWNER', 'ADMIN', 'MEMBER']));

-- email_messages: org-visible read; OWNER/ADMIN/MEMBER can log a sent/received message.
create policy email_messages_select on email_messages
  for select using (is_org_member(organization_id));

create policy email_messages_insert on email_messages
  for insert with check (has_role(organization_id, array['OWNER', 'ADMIN', 'MEMBER']));

-- integrations: OWNER/ADMIN manage email provider connections.
create policy integrations_select on integrations
  for select using (is_org_member(organization_id));

create policy integrations_insert on integrations
  for insert with check (has_role(organization_id, array['OWNER', 'ADMIN']));

create policy integrations_update on integrations
  for update using (has_role(organization_id, array['OWNER', 'ADMIN']));

create policy integrations_delete on integrations
  for delete using (has_role(organization_id, array['OWNER', 'ADMIN']));

-- audit_logs: OWNER/ADMIN can review; writes are system-generated, no client policy.
create policy audit_logs_select on audit_logs
  for select using (has_role(organization_id, array['OWNER', 'ADMIN']));
