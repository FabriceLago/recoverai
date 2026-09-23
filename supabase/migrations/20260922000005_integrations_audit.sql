-- Email provider integrations (Gmail/Outlook) and the org-wide audit trail.

create table integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  provider text not null check (provider in ('GMAIL', 'OUTLOOK')),
  status text not null default 'DISCONNECTED' check (
    status in ('DISCONNECTED', 'CONNECTED', 'ERROR')
  ),
  access_token_encrypted text,
  refresh_token_encrypted text,
  expires_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider)
);

create trigger integrations_set_updated_at
  before update on integrations
  for each row execute function set_updated_at();

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index audit_logs_organization_id_idx on audit_logs (organization_id);
create index audit_logs_entity_idx on audit_logs (entity_type, entity_id);

alter table integrations enable row level security;
alter table audit_logs enable row level security;
