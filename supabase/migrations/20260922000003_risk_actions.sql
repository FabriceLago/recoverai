-- Risk scores and recommended actions produced by the Risk Engine / NBA engine.

create table risk_scores (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities (id) on delete cascade,
  score int not null check (score >= 0 and score <= 100),
  risk_level text not null check (risk_level in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  time_score int not null default 0,
  value_score int not null default 0,
  engagement_score int not null default 0,
  deadline_score int not null default 0,
  explanation jsonb not null default '[]',
  calculated_at timestamptz not null default now()
);

create index risk_scores_opportunity_id_idx on risk_scores (opportunity_id);
create index risk_scores_calculated_at_idx on risk_scores (opportunity_id, calculated_at desc);

create table recommended_actions (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities (id) on delete cascade,
  action_type text not null check (
    action_type in ('FOLLOW_UP_NOW', 'FOLLOW_UP_TODAY', 'FOLLOW_UP_SOON', 'MONITOR')
  ),
  priority text not null default 'MEDIUM' check (priority in ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  title text not null,
  description text,
  reason text,
  generated_message jsonb,
  status text not null default 'PENDING' check (status in ('PENDING', 'COMPLETED', 'DISMISSED')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index recommended_actions_opportunity_id_idx on recommended_actions (opportunity_id);
create index recommended_actions_status_idx on recommended_actions (status);

alter table risk_scores enable row level security;
alter table recommended_actions enable row level security;
