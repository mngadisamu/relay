-- Migration 0010: Monday schedule and automated weekly reports (S2-34)
-- This function generates and saves reports for all four departments for the previous week.

create or replace function generate_weekly_reports()
returns void
language plpgsql
security definer
as $$
declare
    v_dept text;
    v_week_start date;
    v_week_end date;
    v_metrics jsonb;
    v_payload jsonb;
    depts text[] := array['HR', 'IT', 'Finance', 'Operations'];
    v_manager_id uuid;
begin
    -- Calculate last week's Monday (Week start) and Sunday (Week end)
    v_week_start := date_trunc('week', current_date - interval '7 days')::date;
    v_week_end := (v_week_start + interval '6 days')::date;

    -- Fallback manager ID for tracking record creation
    select id into v_manager_id from profiles where role = 'manager' limit 1;

    foreach v_dept in array depts
    loop
        -- Fetch metrics using the unified dashboard_metrics function
        select dashboard_metrics(v_week_start::text, v_week_end::text, v_dept) into v_metrics;

        -- Build the standard report payload structure
        v_payload := jsonb_build_object(
            'department', v_dept,
            'week_start', v_week_start::text,
            'week_end', v_week_end::text,
            'metrics', v_metrics,
            'ai_summary', null, -- Will be lazy-loaded on first open by a manager
            'forecast', jsonb_build_object('projection', 'Weekly scheduled forecast projection', 'days', '[]'::jsonb),
            'oldest_tickets', '[]'::jsonb
        );

        -- Insert into reports table (enforces unique constraint per department per week)
        insert into reports (department, week_start, week_end, payload, created_by)
        values (
            v_dept,
            v_week_start::text,
            v_week_end::text,
            v_payload,
            v_manager_id
        )
        on conflict (department, week_start) do nothing;
    end loop;
end;
$$;