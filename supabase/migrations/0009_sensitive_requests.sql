-- 0009: sensitive requests (responsible AI). Owner: Samukelo.
--
-- Some requests need a person's care, not a quick AI reply: harassment, someone
-- at risk, an injury or hijacking, a hacked account, a health matter. The app
-- spots them when a request is sent (src/lib/sensitive.ts) and marks the ticket.
-- A sensitive ticket's text is never sent to Gemini, and its reply can't go
-- out unchanged; both rules live in the app code.
--
-- Safe to run twice: "if not exists" and the checks on the templates.
-- (0008 is Baphakamise's reports table. The flags table, S2-26, comes after this.)

-- 1. The mark on the ticket, and what kind of sensitive request it is.
--    Set by the submit action; existing tickets stay not sensitive.
alter table "public"."tickets"
  add column if not exists is_sensitive boolean not null default false,
  add column if not exists sensitive_kind text
    check (sensitive_kind in ('conduct', 'wellbeing', 'incident', 'security', 'personal'));

-- 2. Starting text for replies to sensitive requests, one per department that
--    receives them. Agents adapt it before sending. They show in the Template
--    library, so agents and managers of that department can edit them (0004).
insert into public.templates (department, name, body)
select v.department::public.department, 'Sensitive', v.body
from (values
  ('HR',
'Dear [Staff Name],

Thank you for telling us about this. We know it can be hard to raise, and we take it seriously.

What you have shared is confidential. Only the HR team handling your request can see it.

A member of the HR team will contact you today to talk it through with you, at a time and in a way that suits you. If you are in danger right now, or someone has been hurt, please call the depot emergency number or speak to your manager straight away.

HR team, Kopano Freight'),
  ('IT',
'Dear [Staff Name],

Thank you for reporting this straight away. We are treating it as a security matter.

Please stop using the affected account or device until we contact you, and do not share any passwords, not even with IT. If you clicked a link or typed in your details, tell us roughly when it happened.

A member of the IT team will contact you as soon as possible today.

IT team, Kopano Freight'),
  ('Operations',
'Dear [Staff Name],

Thank you for reporting this. Your safety, and the safety of everyone involved, comes first.

If anyone is hurt or in danger, call emergency services (10111 for the police, 10177 for an ambulance, or 112 from a cell phone) and the control room straight away. Do not move a damaged vehicle or load until we tell you it is safe.

A member of the Operations team will contact you today to check that you have the support you need and to arrange next steps.

Operations team, Kopano Freight')
) as v(department, body)
where not exists (
  select 1 from public.templates t
  where t.department = v.department::public.department and t.name = 'Sensitive'
);
