create table if not exists campaigns (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists ledger_events (
  id text primary key,
  campaign_id text not null references campaigns(id) on delete cascade,
  session_id text not null,
  event_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists approval_queue (
  id text primary key,
  campaign_id text not null references campaigns(id) on delete cascade,
  proposal_type text not null,
  status text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
