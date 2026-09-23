-- DEMO SEED (§38). Everything here is fictional demo data: 1 organization,
-- 4 users (one per role), 20 opportunities and revenue events. Opportunities
-- are tagged source = 'SIMULATION' so the app shows its SIMULATION MODE banner.
-- Demo login password for all four users: demo-password-123
-- Triggers (risk snapshots, recommended actions) populate automatically.

create extension if not exists pgcrypto;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  crypt('demo-password-123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', u.full_name), now(), now(), '', '', '', ''
from (values
  ('11111111-1111-1111-1111-111111111101'::uuid, 'owner@demo.recoverai.test',  'Olivia Owner'),
  ('11111111-1111-1111-1111-111111111102'::uuid, 'admin@demo.recoverai.test',  'Adam Admin'),
  ('11111111-1111-1111-1111-111111111103'::uuid, 'member@demo.recoverai.test', 'Mia Member'),
  ('11111111-1111-1111-1111-111111111104'::uuid, 'viewer@demo.recoverai.test', 'Victor Viewer')
) as u(id, email, full_name);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email), 'email', now(), now(), now()
from auth.users u
where u.email like '%@demo.recoverai.test';

insert into organizations (id, name, slug)
values ('22222222-2222-2222-2222-222222222222', 'Demo Agency', 'demo-agency');

insert into memberships (organization_id, user_id, role) values
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111101', 'OWNER'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111102', 'ADMIN'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111103', 'MEMBER'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111104', 'VIEWER');

-- profiles rows are created by the on_auth_user_created trigger.
update profiles set organization_id = '22222222-2222-2222-2222-222222222222'
where id in (select user_id from memberships where organization_id = '22222222-2222-2222-2222-222222222222');

-- 20 deterministic opportunities spanning every risk level.
insert into opportunities (
  organization_id, company_name, contact_name, contact_email, title, value, currency,
  status, source, created_at, last_contact_at, expected_close_date, email_count, reply_count, owner_id
)
select
  '22222222-2222-2222-2222-222222222222',
  (array['Nova Digital','Atlas Studio','BrightPath','Kernel Labs','Vertex Agency',
         'Northwind Co','Solstice Media','Clearline','Momentum Group','Orbit Works'])[(i % 10) + 1],
  'Demo Contact ' || i,
  'contact' || i || '@demo-company.example',
  (array['E-commerce redesign','Mobile app','Corporate website','Annual SEO retainer','B2B SaaS platform',
         'Brand identity refresh','Marketing automation','CRM integration','Landing page sprint','Content strategy'])[(i % 10) + 1],
  (array[7500,12000,4500,6000,15000,5500,8500,9500,3200,4200])[(i % 10) + 1],
  'EUR',
  case
    when i in (10, 20) then 'WON'
    when i = 13 then 'LOST'
    else (array['NEW','QUALIFIED','PROPOSAL_SENT','NEGOTIATION'])[(i % 4) + 1]
  end,
  'SIMULATION',
  now() - ((30 + i * 3) || ' days')::interval,
  now() - (((i * 7) % 33) || ' days')::interval,
  current_date + ((i * 5) % 60) - 10,
  (i % 4) + (i % 3),
  i % 4,
  '11111111-1111-1111-1111-111111111103'
from generate_series(1, 20) as i;

-- Recovered revenue for the closed-won deals.
insert into revenue_events (organization_id, opportunity_id, event_type, amount, currency)
select organization_id, id, 'RECOVERED', value, currency
from opportunities
where organization_id = '22222222-2222-2222-2222-222222222222' and status = 'WON';
