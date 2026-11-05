# Sprint 2+3 stories (2 to 13 Nov 2026)

Every story in the Sprint 2+3 plan, with its acceptance criteria, in a form AI tools can read.
The plan itself (`docs/sprints/Relay Sprint 2+3 Plan (1).docx`) also has how to build each story, what it depends on and what's out of scope.
Where a decision made after planning changes a story, it's in a **Note** under it.

Contracts the stories build against: lifecycle ([AGENTS.md](../../AGENTS.md), migration 0006) · metrics ([`docs/metrics.md`](../metrics.md)) · audit actions and AiNote ([`docs/audit-actions.md`](../audit-actions.md)) · forecast ([`docs/forecast.md`](../forecast.md)).

## Samukelo

### S2-01 · Process fixes (Tue 3 Nov)

As a reviewer, I want every pull request checked automatically and testable on a preview link, so that broken code never reaches main. (G10, G11)

- **Given** a new pull request\
  **When** Vercel builds it\
  **Then** its preview link opens the sign-in page
- **Given** a pull request with a lint, type or build error\
  **When** it is opened\
  **Then** the GitHub check fails and shows the error
- **Given** a pull request that builds\
  **When** the check runs\
  **Then** it passes and the pull request can be approved

### S2-02 · Role homes and public home page (Tue 3 Nov)

As a manager or compliance officer, I want my own home page and menu, so that I can reach my screens in one tap. (G4, G8)

- **Given** I sign in as a manager\
  **When** the page loads\
  **Then** I land on /manager with Dashboard, Reports, Forecast and Manage users in the menu
- **Given** I sign in as compliance\
  **When** the page loads\
  **Then** I land on /compliance with Audit log, Flagged replies and Risk report
- **Given** I am signed out\
  **When** I open the home page\
  **Then** I see Relay's name, one line on what it does and a Sign in button, with no "Sprint 1" text\
  **And** all text on these pages meets WCAG 2.1 AA contrast

### S2-06 · Ticket lifecycle (Wed 4 Nov)

As the team, I want the database to record who a ticket is assigned to and when it was closed, so that the dashboard, reports and forecast can measure the whole journey. (Contract 1; G2, G5, G7)

- **Given** migration 0006 is run\
  **When** an IT agent calls assign_ticket on an IT ticket\
  **Then** its status is Assigned, assigned_at is set and an assign entry is in audit_log
- **Given** a staff member's answered ticket\
  **When** they call close_ticket on it\
  **Then** it is Closed with closed_at set\
  **And** the same call on someone else's ticket is refused
- **Given** a Needs review ticket\
  **When** an agent of that department calls confirm_department\
  **Then** needs_review is false and a confirm_department entry is saved
- **Given** a request sent at 00:30 SAST on 5 Nov\
  **When** it is saved\
  **Then** its reference starts KF-261105

### S2-07 · Audit actions and AI note (Wed 4 Nov)

As a developer on the team, I want one list of audit actions and one AI note component, so that every feature records and labels AI work the same way. (Contract 3)

- **Given** docs/audit-actions.md\
  **When** a developer reads it\
  **Then** it lists all 14 actions (classify, draft, send, reroute, confirm_department, assign, close, template_edit, user_create, role_change, insight_generate, report_download, flag, flag_resolve) and what each puts in details
- **Given** the AiNote component\
  **When** it is placed under a classification\
  **Then** it reads, e.g., "Routed by AI · 92% sure · an agent can change it"\
  **And** it has agreed wording for drafts, summaries and forecasts

### S2-11 · Priority and confirming the department (Thu 5 Nov)

As a staff member, I want to say how urgent my request is, and as an agent, I want to confirm a correct department, so that urgent work comes first and "Needs review" means something. (G3, G5)

- **Given** the submit form\
  **When** I open it\
  **Then** "How urgent is it?" offers Low, Medium, High and Urgent, set to Medium
- **Given** I choose Urgent\
  **When** I send the request\
  **Then** it is first in the agent's inbox with an Urgent tag
- **Given** a Needs review ticket in the right department\
  **When** the agent clicks "Department is correct"\
  **Then** the tag disappears and the routing panel says "Confirmed by" with their name

### S2-12 · Audit log screen (Thu 5 Nov)

As a compliance officer, I want every AI decision and human change searchable, so that I can answer "who did what, and when?" for any ticket.

- **Given** I open Audit log\
  **When** it loads\
  **Then** I see entries newest first with the time (SAST), who, the action, the ticket reference and a summary
- **Given** the list\
  **When** I filter by reroute and 1 to 13 Nov\
  **Then** only reroutes in that period show
- **Given** a ticket reference\
  **When** I search for it\
  **Then** I see its whole history in order, from classify to close\
  **And** Export CSV downloads the filtered entries

### S2-16 · Take and assign (Fri 6 Nov)

As an agent, I want to take a ticket, and as a manager, I want to assign one, so that everyone knows who is working on what. (G2)

- **Given** an unassigned IT ticket\
  **When** an IT agent clicks Take ticket\
  **Then** it shows "Assigned to you" and its status is Assigned\
  **And** the staff member's status history shows Assigned with the time
- **Given** the inbox\
  **When** I choose Mine\
  **Then** only tickets assigned to me show
- **Given** a manager on any ticket\
  **When** they pick an agent from that department and click Assign\
  **Then** that agent sees it under Mine

### S2-20 · Close a ticket (Mon 9 Nov)

As a staff member, I want to confirm that a reply solved my problem, so that the ticket is closed and the team knows it's done. (G2, G6)

- **Given** my request is Answered\
  **When** I open it\
  **Then** I see "This solved it" and "I still need help"
- **Given** I tap "This solved it"\
  **When** the page updates\
  **Then** it is Closed with the time in the status history, and the agent's inbox shows Closed
- **Given** I tap "I still need help" and write what's still wrong\
  **When** I send it\
  **Then** it goes back to Assigned and the agent sees my message above the reply box\
  **And** an agent can also close an Answered ticket with Close ticket

> **Note:** **Decided at planning:** the "I still need help" message is saved in `ticket_messages` through `reopen_ticket()` (migration 0006).

### S2-21 · Bias test (Mon 9 Nov)

As the team, I want to test whether Relay treats people differently because of their name or depot, so that we can show the AI is fair, or fix it if it isn't.

- **Given** 40 requests, each sent with four names (Thabo Mokoena, Sarah van der Merwe, Priya Naidoo, Johan Botha)\
  **When** the classifier routes them\
  **Then** the department is the same for all four names, and any difference is listed
- **Given** the same requests with only the depot changed\
  **When** they are routed\
  **Then** any change of department is listed
- **Given** 10 Gemini drafts for each name\
  **When** they are compared\
  **Then** differences in length, tone and help offered are written up in docs/responsible-ai/bias-test.md

### S2-25 · Manage users (Tue 10 Nov)

As a manager, I want to add people and set their role and department, so that new staff and agents can use Relay without anyone opening Supabase. (G1)

- **Given** I am a manager on Manage users\
  **When** I add Ayanda Zulu, ayanda.zulu@relay.test, as an Agent in HR\
  **Then** she appears in the list and gets an invite email
- **Given** Thabo Mokoena is Staff\
  **When** I change him to Agent in IT\
  **Then** his next sign-in lands on the IT inbox
- **Given** I choose Agent with no department\
  **When** I click Save\
  **Then** "Choose a department for this agent" shows under the field and nothing is saved\
  **And** an agent who opens /manager/users is sent back to their inbox

> **Note:** **Open decision:** whether the invite uses Supabase's admin API with the secret key (only in `src/lib/supabase/admin.ts`, after `requireRole`).

### S2-26 · Flag AI replies (Tue 10 Nov)

As a compliance officer, I want risky AI replies flagged automatically, so that I can check them without reading every reply.

- **Given** an agent sends an AI draft without changing it\
  **When** the reply is saved\
  **Then** it is flagged "Sent without edits"
- **Given** a sent reply with an amount or date that isn't in the ticket or template\
  **When** the reply is saved\
  **Then** it is flagged "Possible invented detail"
- **Given** any sent reply\
  **When** an agent or compliance officer clicks Flag and writes a reason\
  **Then** it is flagged with that reason\
  **And** on Flagged replies, Resolve asks for a note and saves a flag_resolve entry

> **Note:** Sensitive requests are already handled by migration 0009 and `src/lib/sensitive.ts` (no Gemini, personal reply required). Fraud and whistleblowing reports (visible to compliance) fit here.

### S2-30 · Risk report (Wed 11 Nov)

As a compliance officer, I want one report on how the AI is behaving, so that the risks are visible and can be shared.

- **Given** I open Risk report for a date range\
  **When** it loads\
  **Then** I see replies drafted by AI, % sent without edits, % of routings changed by an agent, % marked Needs review, flags open and resolved, and the bias test summary
- **Given** the report\
  **When** I click Export PDF\
  **Then** it downloads in the weekly report layout
- **Given** every AI output in Relay (routing, drafts, summary, forecast)\
  **When** each screen is checked\
  **Then** each one shows its AI note

### S2-31 · Responsible AI documents (Wed 11 Nov)

As the team, I want our AI risks, prompts and data handling written down, so that the panel and Kopano Freight can see we thought about them. (G9, G12)

- **Given** docs/responsible-ai/\
  **When** it is merged\
  **Then** it has the responsible AI note, the risk register, the POPIA note, and the prompt and template notes with ethics talking points
- **Given** docs/architecture.md\
  **When** it is updated\
  **Then** it shows the reports, insights and flags tables, the Monday schedule and the forecast\
  **And** every risk in the register links to the screen or check that handles it

## Elzel

### S2-03 · Daily history (Tue 3 Nov)

As the forecaster, I want tickets counted per day for each department over the past year, so that the forecast learns from real patterns.

- **Given** the past and live tickets\
  **When** the daily history is built for HR\
  **Then** there is one count per day from 19 Oct 2025 to today, with 0 on days with no tickets
- **Given** the HR history\
  **When** the daily counts are added up\
  **Then** the total matches the number of HR tickets in the database
- **Given** the history for all four departments\
  **When** it is charted in the notebook\
  **Then** the weekday and month-end patterns are visible, and the chart is saved for the method note

### S2-08 · Forecast method (Wed 4 Nov)

As a manager, I want the expected number of requests per day for each department for the next four weeks, so that I can plan ahead. (Contract 4)

- **Given** the daily history\
  **When** forecast('HR') runs\
  **Then** it returns 28 days, each with a date and the expected number of tickets
- **Given** a forecast that covers the 25th to the end of the month\
  **When** it is compared with the days before\
  **Then** those days are higher
- **Given** the same history\
  **When** it runs twice\
  **Then** the result is identical\
  **And** docs/forecast.md shows the function's input and output shape

> **Note:** **Changed on Thu 5 Nov (Samukelo):** the function is `forecast(history, { department, asOf, days })`, not `forecast('HR')`, and it has no `generatedAt`. See the decisions and shape in [`docs/forecast.md`](../forecast.md); its HR example is the first test.

### S2-13 · Forecast range (Thu 5 Nov)

As a manager, I want a low and a high value for each forecast day, so that I know how sure the forecast is.

- **Given** the forecast\
  **When** it runs\
  **Then** each day has a low and a high value around the expected one (an 80% range)
- **Given** the last 8 weeks of real tickets\
  **When** the range is checked against them\
  **Then** about 8 in 10 real days fall inside it
- **Given** a day with little history (e.g. a public holiday)\
  **When** it is forecast\
  **Then** the range is wider, not missing

> **Note:** The method and history are in [`docs/forecast.md`](../forecast.md). Until S2-13 lands, `low` and `high` equal `expected`.

### S2-17 · Forecast backtest (Fri 6 Nov)

As a manager, I want to know how accurate the forecast has been, so that I can decide how much to trust it.

- **Given** the history up to 4 weeks ago\
  **When** the forecast is made from it and compared with what really happened\
  **Then** the average error per day is reported for each department (e.g. "off by 2.1 tickets a day")
- **Given** the backtest\
  **When** it is compared with a simple "same as last week" guess\
  **Then** both errors are shown side by side\
  **And** the results are saved in docs/forecast.md

> **Note:** Use `asOf` and a history cut 4 weeks short to forecast "as if it were 4 weeks ago" ([`docs/forecast.md`](../forecast.md)).

### S2-22 · Forecast method note (Mon 9 Nov)

As someone reading the forecast, I want its method and limits explained in plain words, so that nobody treats it as certain.

- **Given** docs/forecast.md\
  **When** a manager reads it\
  **Then** it explains the method in one paragraph, without formulas\
  **And** it lists the limits: past ticket dates are assigned, public holidays, new kinds of request\
  **And** it includes the backtest results and the history chart

### S2-27 · Forecast view (Tue 10 Nov)

As a manager, I want to see the forecast as a picture, so that I understand it without reading numbers.

- **Given** I open Forecast\
  **When** I pick HR\
  **Then** a line shows the last 8 weeks (actual) and the next 4 weeks (forecast), with the range shaded\
  **And** it is labelled "Forecast from past tickets" with the backtest error and the AI note
- **Given** a 360 px phone\
  **When** I open Forecast\
  **Then** the chart fits, and a text summary is there for screen readers

> **Note:** Load the history from the daily-counts database function (Samukelo, next migration) and pass it to `forecast` ([`docs/forecast.md`](../forecast.md)).

### S2-32 · Forecast callout and staffing hint (Wed 11 Nov)

As a manager, I want a plain sentence about busy days and how many agents I'll need, so that I can act on the forecast.

- **Given** a forecast with a month-end rise\
  **When** the forecast view loads\
  **Then** a callout reads, e.g., "Expect about 40% more HR requests from 25 to 30 Nov"
- **Given** I enter how many tickets one agent handles per day (default 15)\
  **When** I change it\
  **Then** each week shows the agents needed, e.g. "Week of 23 Nov: 3 agents", labelled an estimate

## Mihlali

### S2-04 · Metrics shape and data dictionary (Tue 3 Nov)

As the team, I want the dashboard numbers agreed and written down before anyone builds a screen, so that the dashboard, reports and forecast use the same definitions.

- **Given** docs/metrics.md\
  **When** a developer reads it\
  **Then** it shows the exact JSON shape dashboard_metrics() will return, with an example
- **Given** each metric in the document\
  **When** it is read\
  **Then** it says how it is calculated (e.g. hours to first reply = answered_at minus created_at) and its limits
- **Given** the document at stand-up\
  **When** Elzel and Baphakamise check it\
  **Then** both confirm it has the numbers they need

### S2-09 · Metrics function (Wed 4 Nov)

As the team, I want one database function that calculates the help desk numbers, so that every screen shows the same numbers. (Contract 2)

- **Given** the past tickets\
  **When** a manager calls dashboard_metrics('2026-09-01', '2026-09-30', null)\
  **Then** it returns the numbers in the shape in docs/metrics.md
- **Given** department 'HR'\
  **When** it is called\
  **Then** every number is for HR only
- **Given** an agent\
  **When** they call it\
  **Then** they get only their department's numbers\
  **And** every call answers in under 1 second

### S2-14 · Dashboard number cards and filters (Thu 5 Nov)

As a manager, I want the key numbers at the top of my dashboard, so that I see how the help desk is doing at a glance.

- **Given** I open Dashboard\
  **When** it loads\
  **Then** four cards show tickets, average hours to first reply, open tickets and % needing review, each with the change since the period before
- **Given** the filters\
  **When** I choose Finance and 1 to 30 Sep\
  **Then** every card shows Finance in September\
  **And** the URL keeps the filter, so it can be shared
- **Given** a 360 px phone\
  **When** I open the dashboard\
  **Then** the cards stack in one column

### S2-18 · Dashboard charts (Fri 6 Nov)

As a manager, I want to see the trend and the split by department, so that I spot changes over time.

- **Given** the dashboard\
  **When** it loads\
  **Then** a line chart shows tickets per week for the last 12 weeks\
  **And** a bar chart shows tickets per department
- **Given** the filters\
  **When** I change them\
  **Then** both charts update
- **Given** each chart\
  **When** a screen reader reaches it\
  **Then** it reads a text summary (e.g. "Tickets rose from 210 to 260 a week")

### S2-23 · Dashboard 10-second test (Mon 9 Nov)

As the team, I want colleagues to try the dashboard, so that it tells a manager the right thing at a glance.

- **Given** two colleagues outside the team\
  **When** each looks at the dashboard for 10 seconds\
  **Then** what they say it tells them is written down
- **Given** their answers\
  **When** they are reviewed\
  **Then** at least one change is made\
  **And** before and after screenshots are saved in docs/design/dashboard-test.md

### S2-28 · Weekly insights (Tue 10 Nov)

As a manager, I want a few sentences explaining this week's numbers, so that I understand what changed without working it out myself.

- **Given** a week's metrics\
  **When** the summary is generated\
  **Then** Gemini returns 3 to 5 sentences based only on the numbers, with no ticket text or names sent
- **Given** the summary\
  **When** it is checked\
  **Then** every number in it is in the metrics; otherwise it is rejected
- **Given** Gemini fails or takes over 10 seconds\
  **When** the summary is generated\
  **Then** it returns "unavailable" instead\
  **And** each summary is saved with its numbers and an insight_generate entry

### S2-33 · Insights on the dashboard (Wed 11 Nov)

As a manager, I want the weekly summary on my dashboard, so that I read it where I look at the numbers.

- **Given** the dashboard for a week\
  **When** it loads\
  **Then** a box labelled "AI summary · written from the numbers above" shows the saved summary with the AI note
- **Given** no summary yet\
  **When** the box loads\
  **Then** it says "Summary unavailable; the numbers above are up to date"\
  **And** the whole dashboard meets WCAG 2.1 AA and fits a 360 px phone

## Baphakamise

### S2-05 · Report template spec (Tue 3 Nov)

As a manager, I want the weekly report's content and layout agreed first, so that it shows what managers need.

- **Given** docs/report-template.md\
  **When** it is read\
  **Then** it lists each section (the week's numbers, AI summary, 4-week forecast, 5 oldest open tickets) and where each number comes from\
  **And** it has a sketch of the page with Relay's logo and colours
- **Given** the spec at stand-up\
  **When** Mihlali and Elzel check it\
  **Then** both confirm their features can supply those sections

### S2-10 · Reports table (Wed 4 Nov)

As a manager, I want each report saved as it was when it was made, so that downloading it later gives the same numbers.

- **Given** migration 0008 is run\
  **When** I look at the database\
  **Then** a reports table has department, week, the numbers, the AI summary, the forecast and the time it was made
- **Given** a manager saves a report\
  **When** staff or agents try to read it\
  **Then** they get nothing
- **Given** a report for Finance, week of 2 Nov, already exists\
  **When** another one is saved for the same department and week\
  **Then** it is refused, so there is one report per department per week

### S2-15 · Report preview (Thu 5 Nov)

As a manager, I want to preview a department's weekly report, so that I can check it before I share it.

- **Given** I open Reports\
  **When** I choose Finance and the week of 2 Nov\
  **Then** I see that week's numbers from dashboard_metrics(), laid out as in the template spec
- **Given** the preview\
  **When** I switch to HR\
  **Then** it shows HR's numbers
- **Given** an agent\
  **When** they open Reports\
  **Then** they are sent back to their inbox

### S2-19 · Report PDF download (Fri 6 Nov)

As a manager, I want to download the report as a PDF, so that I can share it with people who don't use Relay.

- **Given** the Finance preview for the week of 2 Nov\
  **When** I click Download PDF\
  **Then** Relay-Finance-2026-11-02.pdf downloads with Relay's logo, colours and the same content as the preview
- **Given** a download\
  **When** it finishes\
  **Then** a report_download entry is saved in audit_log\
  **And** the PDF route can be reused for the risk report (S2-30)

### S2-24 · Forecast and open-ticket report sections (Mon 9 Nov)

As a manager, I want the report to show what's coming and what's stuck, so that it helps me plan the week.

- **Given** the Finance report\
  **When** it is previewed\
  **Then** a section shows the next 4 weeks from forecast('Finance'), with its range\
  **And** a section shows the 5 oldest open tickets with reference, subject and age, and no names
- **Given** the PDF\
  **When** it is downloaded\
  **Then** both sections are in it

> **Note:** Call `forecast(history, { department: 'Finance', asOf })` from [`docs/forecast.md`](../forecast.md), not `forecast('Finance')`.

### S2-29 · Saved reports list (Tue 10 Nov)

As a manager, I want past reports listed, so that I can download last month's report again.

- **Given** I open Reports\
  **When** it loads\
  **Then** saved reports are listed by week and department, newest first
- **Given** a saved report\
  **When** I download it a week later\
  **Then** it shows the same numbers as when it was made

### S2-34 · Monday report schedule and AI summary (Wed 11 Nov)

As a manager, I want reports made automatically every Monday with a written summary, so that they're ready when my week starts.

- **Given** it is Monday 06:00 SAST\
  **When** the scheduled job runs\
  **Then** a report is saved for each of the four departments for the week before
- **Given** a scheduled report\
  **When** a manager first opens it\
  **Then** the AI summary (S2-28) is added and saved, labelled as written by AI\
  **And** running the job once by hand in the SQL Editor makes four reports (for the demo)
