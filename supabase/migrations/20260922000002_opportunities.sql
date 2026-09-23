-- Opportunities and the signals detected against them.

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  company_name text not null,
  contact_name text,
  contact_email text,
  title text not null,
  description text,
  value numeric(12, 2) not null default 0,
  currency text not null default 'EUR',
  status text not null default 'NEW' check (
    status in ('NEW', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST', 'DORMANT')
  ),
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_contact_at timestamptz,
  expected_close_date date,
  email_count int not null default 0,
  reply_count int not null default 0,
  owner_id uuid references auth.users (id) on delete set null
);

create index opportunities_organization_id_idx on opportunities (organization_id);
create index opportunities_status_idx on opportunities (status);
create index opportunities_owner_id_idx on opportunities (owner_id);

create trigger opportunities_set_updated_at
  before update on opportunities
  for each row execute function set_updated_at();

create table opportunity_signals (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities (id) on delete cascade,
  signal_type text not null check (
    signal_type in (
      'NO_RESPONSE', 'LONG_SILENCE', 'HIGH_VALUE', 'CLOSING_SOON', 'LOW_ENGAGEMENT', 'RECENT_REPLY'
    )
  ),
  signal_value text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index opportunity_signals_opportunity_id_idx on opportunity_signals (opportunity_id);

alter table opportunities enable row level security;
alter table opportunity_signals enable row level security;
