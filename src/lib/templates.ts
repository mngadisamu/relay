// Built-in reply templates (S1-04): Formal, Friendly, Urgent for each department.
// The real ones live in the templates table (S1-27) and are edited in the
// Template library; these are only used if that table is still empty.
// They match supabase/seed/templates.sql, which loads them into the database.
export const departmentTemplates: Record<string, string[]> = {
  "HR": [
    "Dear [Staff Name],\n\nThank you for contacting HR about \"[Subject]\". We have received your request and a member of the HR team is looking into it.\n\nWe will reply within two working days. If we need documents from you, such as a doctor's note or bank confirmation letter, we will tell you what to send.\n\nKind regards,\nHR team, Kopano Freight",
    "Hi [Staff Name],\n\nThanks for getting in touch about \"[Subject]\". We're on it and will come back to you within two working days.\n\nIf anything changes in the meantime, just reply here.\n\nThanks,\nHR team",
    "Dear [Staff Name],\n\nWe have received your urgent request about \"[Subject]\" and it has been given priority. A member of the HR team will contact you today.\n\nIf this concerns your safety or wellbeing at work, please also speak to your depot manager straight away.\n\nHR team, Kopano Freight"
  ],
  "IT": [
    "Dear [Staff Name],\n\nThank you for reporting \"[Subject]\". Your request has been logged with the IT team and a technician will look into it.\n\nWe aim to respond within one working day. If the problem stops you from working, please let us know so we can prioritise it.\n\nKind regards,\nIT team, Kopano Freight",
    "Hi [Staff Name],\n\nThanks for letting us know about \"[Subject]\". We're looking into it and will update you soon, usually within a working day.\n\nIf you can, keep the device switched on and nearby so we can help you quickly.\n\nCheers,\nIT team",
    "Dear [Staff Name],\n\nWe have received your urgent report about \"[Subject]\". A technician is being assigned now and will contact you as soon as possible today.\n\nIf drivers or deliveries are affected, please tell us how many, so we can plan a workaround.\n\nIT team, Kopano Freight"
  ],
  "Finance": [
    "Dear [Staff Name],\n\nThank you for your query about \"[Subject]\". The Finance team has received it and will review it against our records.\n\nWe will respond within three working days. Please keep any slips or invoices related to this request, as we may ask for copies.\n\nKind regards,\nFinance team, Kopano Freight",
    "Hi [Staff Name],\n\nThanks for reaching out about \"[Subject]\". We're checking it now and will get back to you within three working days.\n\nIf you have a receipt or slip, please keep it handy.\n\nThanks,\nFinance team",
    "Dear [Staff Name],\n\nWe have received your urgent request about \"[Subject]\" and are dealing with it today.\n\nIf you are on the road and unable to pay for fuel or tolls, please call your depot manager for an emergency arrangement while we resolve this.\n\nFinance team, Kopano Freight"
  ],
  "Operations": [
    "Dear [Staff Name],\n\nThank you for your request about \"[Subject]\". The Operations team has received it and will arrange the next steps.\n\nWe will update you within one working day. For any safety concern, please follow the depot safety procedure in the meantime.\n\nKind regards,\nOperations team, Kopano Freight",
    "Hi [Staff Name],\n\nThanks for the heads-up about \"[Subject]\". We're sorting it out and will let you know what happens next, usually within a working day.\n\nStay safe out there.\n\nOperations team",
    "Dear [Staff Name],\n\nWe have received your urgent report about \"[Subject]\". The Operations control room is dealing with it now.\n\nIf you or anyone else is in danger, move to a safe place and call the control room immediately. Do not move a damaged vehicle or load until we tell you it is safe.\n\nOperations team, Kopano Freight"
  ]
};
