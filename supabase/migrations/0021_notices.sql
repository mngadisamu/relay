-- Migration 0021: In-app notices fallback for notifications (S4-10)
create table if not exists notices (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references profiles(id) on delete cascade,
    title text not null,
    message text not null,
    link text,
    read boolean default false,
    created_at timestamptz default now()
);

-- Enable RLS
alter table notices enable row level security;

create policy "Users can view their own notices"
    on notices for select
    using (auth.uid() = user_id);

create policy "System can insert notices"
    on notices for insert
    with check (true);