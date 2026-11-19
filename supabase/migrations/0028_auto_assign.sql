-- S4-05: give a new ticket to the active agent in its department with the fewest open tickets.
-- Sensitive tickets are left for a manager to assign by hand.
create or replace function public.auto_assign_ticket(p_ticket_id bigint, p_actor uuid)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  v_ticket public.tickets%rowtype;
  v_agent uuid;
begin
  select * into v_ticket from public.tickets where id = p_ticket_id for update;
  if not found then
    raise exception 'Ticket % not found', p_ticket_id;
  end if;

  -- Only the person who sent the request can trigger this (the submit action does, right after saving it).
  if v_ticket.submitted_by is distinct from auth.uid() then
    raise exception 'Only the person who sent this request can trigger assignment';
  end if;

  if v_ticket.assigned_to is not null or v_ticket.status = 'closed' or v_ticket.is_sensitive then
    return null;
  end if;

  select p.id into v_agent
  from public.profiles p
  left join public.tickets t
    on t.assigned_to = p.id and t.status <> 'closed'
  where p.role = 'agent' and p.active and p.department = v_ticket.department
  group by p.id
  order by count(t.id), p.id
  limit 1;

  if v_agent is null then
    return null;  -- no active agent: the ticket stays unassigned for the manager's queue
  end if;

  update public.tickets
     set assigned_to = v_agent, assigned_at = now(), status = 'assigned'
   where id = p_ticket_id;

  insert into public.audit_log (actor, action, ticket_id, details)
  values (p_actor, 'auto_assign', p_ticket_id,
          jsonb_build_object('agent', v_agent, 'department', v_ticket.department));

  return v_agent;
end;
$$;

revoke execute on function public.auto_assign_ticket(bigint, uuid) from public;
grant execute on function public.auto_assign_ticket(bigint, uuid) to authenticated;