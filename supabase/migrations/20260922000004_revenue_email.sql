-- Revenue events (pipeline/at-risk/recovered accounting) and email message log.

create table revenue_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  opportunity_id uuid not null references opportunities (id) on delete cascade,
  event_type text not null check (event_type in ('RECOVERED', 'WON', 'LOST')),
  amount numeric(12, 2) not null,
  currency text not null default 'EUR',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index revenue_events_organization_id_idx on revenue_events (organization_id);
create index revenue_events_opportunity_id_idx on revenue_events (opportunity_id);
create index revenue_events_event_type_idx on revenue_events (event_type);

create table email_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  opportunity_id uuid references opportunities (id) on delete cascade,
  provider text not null default 'MOCK' check (provider in ('MOCK', 'GMAIL', 'OUTLOOK')),
  external_id text,
  direction text not null check (direction in ('OUTBOUND', 'INBOUND')),
  subject text,
  body text,
  sent_at timestamptz,
  received_at timestamptz,
  metadata jsonb not null default '{}'
);

create index email_messages_organization_id_idx on email_messages (organization_id);
create index email_messages_opportunity_id_idx on email_messages (opportunity_id);

alter table revenue_events enable row level security;
alter table email_messages enable row level security;
