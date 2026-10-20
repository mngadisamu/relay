-- Relay initial schema (Sprint 1)
-- Designed for all 8 weeks: later modules add rows, not tables.

create type user_role as enum ('staff', 'agent', 'manager', 'compliance');
create type department as enum ('HR', 'IT', 'Finance', 'Operations');
create type ticket_status as enum ('received', 'assigned', 'answered', 'closed');
create type ticket_priority as enum ('low', 'medium', 'high', 'urgent');
create type reply_tone as enum ('formal', 'friendly', 'urgent');

-- One row per signed-in user, linked to Supabase Auth
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role user_role not null default 'staff',
  department department,            -- set for agents and managers
  depot text,                       -- e.g. Head Office, City Deep, Pomona
  created_at timestamptz not null default now()
);

create table tickets (
  id bigint generated always as identity primary key,
  reference text unique not null default ('KF-' || to_char(now(), 'YYMMDD') || '-' || lpad((floor(random() * 10000))::text, 4, '0')),
  submitted_by uuid references profiles (id),
  subject text not null,
  description text not null,
  depot text,
  department department,            -- final department (classifier or agent)
  priority ticket_priority not null default 'medium',
  status ticket_status not null default 'received',
  needs_review boolean not null default false,
  is_historical boolean not null default false,  -- seeded data for dashboards and forecasts
  created_at timestamptz not null default now(),
  assigned_at timestamptz,
  answered_at timestamptz,
  closed_at timestamptz
);

-- Every classifier decision is kept, not overwritten (Week 6 audit trail)
create table classifications (
  id bigint generated always as identity primary key,
  ticket_id bigint not null references tickets (id) on delete cascade,
  predicted_department department not null,
  confidence numeric(4, 3) not null check (confidence between 0 and 1),
  model_version text not null,
  overridden_by uuid references profiles (id),
  overridden_department department,
  created_at timestamptz not null default now()
);

create table templates (
  id bigint generated always as identity primary key,
  department department not null,
  name text not null,
  body text not null,
  updated_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table responses (
  id bigint generated always as identity primary key,
  ticket_id bigint not null references tickets (id) on delete cascade,
  template_id bigint references templates (id),
  tone reply_tone not null default 'formal',
  ai_draft text,
  final_text text,
  ai_generated boolean not null default true,
  sent_by uuid references profiles (id),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- Filled from Sprint 3 (risk and compliance) and Sprint 4 (approvals)
create table audit_log (
  id bigint generated always as identity primary key,
  actor uuid references profiles (id),
  action text not null,             -- e.g. classify, override, draft, send
  ticket_id bigint references tickets (id) on delete set null,
  details jsonb,
  created_at timestamptz not null default now()
);

create table approvals (
  id bigint generated always as identity primary key,
  ticket_id bigint not null references tickets (id) on delete cascade,
  approver uuid references profiles (id),
  decision text check (decision in ('pending', 'approved', 'rejected')) default 'pending',
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index on tickets (department, status, created_at);
create index on classifications (ticket_id);
create index on responses (ticket_id);

-- Row-level security: on for every table. Policies are added in story S1-03.
alter table profiles enable row level security;
alter table tickets enable row level security;
alter table classifications enable row level security;
alter table templates enable row level security;
alter table responses enable row level security;
alter table audit_log enable row level security;
alter table approvals enable row level security;
