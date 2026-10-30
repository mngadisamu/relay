-- S1-04 / S1-27: the 12 starting reply templates (3 per department, one per tone).
--
-- Run once in the Supabase SQL Editor (paste the contents, not the file path).
-- Safe to run again: a template is only added if its department doesn't
-- already have one with that name, so edits made in Relay are never overwritten.
--
-- Template names match the reply tones (Formal, Friendly, Urgent): the AI
-- starts from the template whose name matches the tone the agent picked.
-- [Staff Name] and [Subject] are filled in from the ticket before drafting.

insert into public.templates (department, name, body)
select v.department::public.department, v.name, v.body
from (values
  ('HR', 'Formal',
   'Dear [Staff Name],

Thank you for contacting HR about "[Subject]". We have received your request and a member of the HR team is looking into it.

We will reply within two working days. If we need documents from you, such as a doctor''s note or bank confirmation letter, we will tell you what to send.

Kind regards,
HR team, Kopano Freight'),
  ('HR', 'Friendly',
   'Hi [Staff Name],

Thanks for getting in touch about "[Subject]". We''re on it and will come back to you within two working days.

If anything changes in the meantime, just reply here.

Thanks,
HR team'),
  ('HR', 'Urgent',
   'Dear [Staff Name],

We have received your urgent request about "[Subject]" and it has been given priority. A member of the HR team will contact you today.

If this concerns your safety or wellbeing at work, please also speak to your depot manager straight away.

HR team, Kopano Freight'),

  ('IT', 'Formal',
   'Dear [Staff Name],

Thank you for reporting "[Subject]". Your request has been logged with the IT team and a technician will look into it.

We aim to respond within one working day. If the problem stops you from working, please let us know so we can prioritise it.

Kind regards,
IT team, Kopano Freight'),
  ('IT', 'Friendly',
   'Hi [Staff Name],

Thanks for letting us know about "[Subject]". We''re looking into it and will update you soon, usually within a working day.

If you can, keep the device switched on and nearby so we can help you quickly.

Cheers,
IT team'),
  ('IT', 'Urgent',
   'Dear [Staff Name],

We have received your urgent report about "[Subject]". A technician is being assigned now and will contact you as soon as possible today.

If drivers or deliveries are affected, please tell us how many, so we can plan a workaround.

IT team, Kopano Freight'),

  ('Finance', 'Formal',
   'Dear [Staff Name],

Thank you for your query about "[Subject]". The Finance team has received it and will review it against our records.

We will respond within three working days. Please keep any slips or invoices related to this request, as we may ask for copies.

Kind regards,
Finance team, Kopano Freight'),
  ('Finance', 'Friendly',
   'Hi [Staff Name],

Thanks for reaching out about "[Subject]". We''re checking it now and will get back to you within three working days.

If you have a receipt or slip, please keep it handy.

Thanks,
Finance team'),
  ('Finance', 'Urgent',
   'Dear [Staff Name],

We have received your urgent request about "[Subject]" and are dealing with it today.

If you are on the road and unable to pay for fuel or tolls, please call your depot manager for an emergency arrangement while we resolve this.

Finance team, Kopano Freight'),

  ('Operations', 'Formal',
   'Dear [Staff Name],

Thank you for your request about "[Subject]". The Operations team has received it and will arrange the next steps.

We will update you within one working day. For any safety concern, please follow the depot safety procedure in the meantime.

Kind regards,
Operations team, Kopano Freight'),
  ('Operations', 'Friendly',
   'Hi [Staff Name],

Thanks for the heads-up about "[Subject]". We''re sorting it out and will let you know what happens next, usually within a working day.

Stay safe out there.

Operations team'),
  ('Operations', 'Urgent',
   'Dear [Staff Name],

We have received your urgent report about "[Subject]". The Operations control room is dealing with it now.

If you or anyone else is in danger, move to a safe place and call the control room immediately. Do not move a damaged vehicle or load until we tell you it is safe.

Operations team, Kopano Freight')
) as v(department, name, body)
where not exists (
  select 1 from public.templates t
  where t.department = v.department::public.department and t.name = v.name
);

-- Check: should list 12 templates (3 per department).
select department, name, left(body, 60) as starts_with, updated_at
from public.templates
order by department, name;
