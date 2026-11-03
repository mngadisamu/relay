-- Migration 0008: Reports Table for Automated Reporting
-- Owner: Baphakamise (S2-10)

create table if not exists public.reports (
    id uuid default gen_random_uuid() primary key,
    department text not null,
    week_start date not null,
    metrics jsonb not null,
    ai_summary text,
    forecast jsonb not null,
    created_at timestamp with time zone default timezone('Africa/Johannesburg'::text, now()) not null,
    
    -- Ensure only one report exists per department per week
    constraint unique_department_week unique (department, week_start)
);

-- Enable Row Level Security (RLS)
alter table public.reports enable row level security;

-- Policy: Managers only can read and write reports
create policy "Managers have full access to reports"
    on public.reports
    for all
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'manager'
        )
    )
    with check (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'manager'
        )
    );