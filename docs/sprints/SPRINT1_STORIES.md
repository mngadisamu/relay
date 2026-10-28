# Sprint 1 user stories (19–30 Oct 2026)

Machine-readable copy of `docs/sprints/Sprint1_Plan.docx`. Each story lists its owner, planned day and acceptance criteria as Given / When / Then scenarios. A story is done only when every scenario passes on the live site.

## S1-01 · Wed 21 Oct · Samukelo

**Story:** As a developer, I want the database tables set up in Supabase, so that the team has one place to store tickets, classifications and replies.

Scenario 1
- Given a new Supabase project
- When migration 0001 is run
- Then the tickets, classifications, responses, templates and audit_log tables exist
- And each ticket has created, assigned, answered and closed times

Scenario 2
- Given the tables exist
- When someone who is not signed in tries to read them
- Then no data is returned (row-level security is on)

## S1-02 · Wed 21 Oct · Elzel

**Story:** As the data developer, I want real IT support tickets downloaded and sorted into our four departments, so that the classifier learns from real examples.

Scenario 1
- Given the Kaggle IT ticket dataset
- When it is saved in data/raw
- Then every ticket is mapped to HR, IT, Finance or Operations
- And no ticket is left without a department

## S1-03 · Wed 21 Oct · Mihlali

**Story:** As the designer, I want a persona for each user role and a journey map, so that the team designs screens around real needs.

Scenario 1
- Given the four roles (staff, agent, manager, compliance)
- When the personas are finished
- Then each role has one persona with goals and frustrations

Scenario 2
- Given the staff persona
- When the journey map is drawn
- Then it shows every step from having a problem to getting a reply

## S1-04 · Wed 21 Oct · Baphakamise

**Story:** As an agent, I want ready-made reply templates for each department, so that every reply starts from approved wording.

Scenario 1
- Given the four departments
- When the templates are written
- Then each department has at least three templates

Scenario 2
- Given a Gemini API key is created
- When the code is pushed to GitHub
- Then the key does not appear anywhere in the code

## S1-05 · Thu 22 Oct · Samukelo

**Story:** As a developer, I want the project running on my own computer with its keys set up, so that I can build and test my feature.

Scenario 1
- Given a team member has cloned the repo and filled in .env.local
- When they run npm run dev
- Then the app opens at localhost:3000

Scenario 2
- Given the keys are added in Vercel
- When code is merged to main
- Then the live site deploys without errors

Scenario 3
- Given the branch rule is on
- When someone pushes straight to main
- Then GitHub blocks it and asks for a pull request

## S1-06 · Thu 22 Oct · Elzel

**Story:** As the data developer, I want HR, Finance and Operations tickets written for Kopano Freight, so that every department has enough examples to train on.

Scenario 1
- Given the real IT tickets
- When the synthetic HR, Finance and Operations tickets are added
- Then each department has a similar number of tickets

Scenario 2
- Given the combined dataset
- When it is saved as a CSV
- Then every ticket has a date within the last 12 months, a depot and a priority
- And a data dictionary explains each column

## S1-07 · Thu 22 Oct · Mihlali

**Story:** As a developer, I want wireframes of every Sprint 1 screen, so that I know what each page should contain before I build it.

Scenario 1
- Given the Sprint 1 user stories
- When the wireframes are finished
- Then there is a wireframe for login, submit request, My requests, request detail, agent inbox, ticket view and template library

Scenario 2
- Given a developer opens a wireframe
- When they read it
- Then they can see every field, button and label the screen needs

## S1-08 · Thu 22 Oct · Baphakamise

**Story:** As an agent, I want the system to draft a reply with AI using the ticket and its department template, so that I don't write every reply from scratch.

Scenario 1
- Given a classified IT ticket
- When a draft is requested
- Then Gemini returns a reply based on an IT template

Scenario 2
- Given the draft is being created
- When I check the browser's network tab
- Then the Gemini key is never sent to the browser

## S1-09 · Fri 23 Oct · Samukelo

**Story:** As a staff member, I want to sign in with my email, so that Relay knows who I am and shows me the right home screen.

Scenario 1
- Given I have a staff account
- When I sign in with my email
- Then I land on the staff home screen

Scenario 2
- Given I have an agent account
- When I sign in
- Then I land on the agent home screen

Scenario 3
- Given I enter the wrong details
- When I try to sign in
- Then I see a clear error and stay on the login page

## S1-10 · Fri 23 Oct · Elzel

**Story:** As the data developer, I want a first classifier trained and tested, so that we know how accurately it routes tickets.

Scenario 1
- Given the combined dataset
- When the TF-IDF + logistic regression model is trained in Google Colab
- Then its accuracy is reported on real tickets it has not seen
- And separately on synthetic tickets

## S1-11 · Fri 23 Oct · Mihlali

**Story:** As the team, I want the wireframes reviewed by classmates, so that confusing screens are fixed before we build them.

Scenario 1
- Given 2–3 classmates who have not seen the wireframes
- When each one is asked to find where to report a broken scanner
- Then any step where they hesitate is written down

Scenario 2
- Given the review notes
- When the review ends
- Then the wireframes are updated to fix each problem

## S1-12 · Fri 23 Oct · Mihlali

**Story:** As a developer, I want shared colours, fonts and components set up, so that every screen looks like the same product.

Scenario 1
- Given the repo
- When a developer builds a new screen
- Then they can use the shared colours, fonts and spacing
- And ready-made shadcn/ui buttons, inputs and cards

## S1-13 · Fri 23 Oct · Baphakamise

**Story:** As an agent, I want every AI draft saved, with the template used if the AI fails, so that a reply is always ready for me.

Scenario 1
- Given a ticket
- When Gemini returns a draft
- Then the draft is saved in the responses table

Scenario 2
- Given Gemini fails or takes longer than 10 seconds
- When a draft is requested
- Then the department template text is used as the draft instead

## S1-14 · Fri 23 Oct · Baphakamise

**Story:** As an agent, I want to switch the reply's tone between formal, friendly and urgent, so that it suits the situation.

Scenario 1
- Given a draft in formal tone
- When I select friendly
- Then a new friendly draft replaces it

Scenario 2
- Given I send a reply
- When it is saved
- Then the tone I used is saved with it

## S1-15 · Mon 26 Oct · Samukelo

**Story:** As a staff member, I want only me to see my requests, so that my information stays private.

Scenario 1
- Given two staff members have each submitted a request
- When one of them opens My requests
- Then they see only their own request

Scenario 2
- Given I am signed in as staff
- When I type the agent inbox address into the browser
- Then I am sent back to my home screen

## S1-16 · Mon 26 Oct · Elzel

**Story:** As the team, I want the classifier to reach 85% accuracy and be saved in a format the app can use, so that it can run inside Relay.

Scenario 1
- Given the trained model
- When it is tested on real tickets it has not seen
- Then accuracy is 85% or higher
- And a confusion matrix shows where it makes mistakes

Scenario 2
- Given the final model
- When it is exported
- Then a JSON file is saved in ml/model and the notebook in ml/notebooks

## S1-17 · Mon 26 Oct · Elzel

**Story:** As a manager, I want past tickets loaded into the database, so that next sprint's dashboard has history to show.

Scenario 1
- Given the combined dataset
- When the seed script is run
- Then the historical tickets appear in the tickets table with their original dates

Scenario 2
- Given the seed script has already run
- When someone runs it again
- Then no tickets are duplicated

## S1-18 · Mon 26 Oct · Mihlali

**Story:** As a user, I want a menu that shows only the pages for my role, so that I can find what I need quickly.

Scenario 1
- Given I am signed in as staff
- When I open the menu
- Then I see Submit request and My requests only

Scenario 2
- Given I am signed in as an agent
- When I open the menu
- Then I see Inbox and Templates

Scenario 3
- Given any screen
- When it is checked with a contrast checker
- Then the text meets WCAG 2.1 AA

## S1-19 · Mon 26 Oct · Baphakamise

**Story:** As an agent, I want an inbox of my department's tickets, so that I know what to work on next.

Scenario 1
- Given I am an IT agent
- When I open my inbox
- Then I see only IT tickets, most urgent first, then oldest

Scenario 2
- Given my inbox
- When I filter by Answered
- Then only answered tickets are shown

Scenario 3
- Given a ticket is flagged "Needs review"
- When I view the inbox
- Then that ticket is clearly marked

## S1-20 · Tue 27 Oct · Samukelo

**Story:** As a CAPACITI assessor, I want a diagram and description of Relay's parts, so that I understand how it is built without reading the code.

Scenario 1
- Given the architecture document in /docs
- When an assessor reads it
- Then they see a diagram of all components
- And why each one was chosen
- And the data model

## S1-21 · Tue 27 Oct · Elzel

**Story:** As a staff member, I want my request sent to the right department automatically, so that I don't need to know who handles what.

Scenario 1
- Given I submit "My payslip is wrong"
- When the request is classified
- Then it is sent to HR within one second

Scenario 2
- Given any classified request
- When the result is saved
- Then the department, confidence and model version are stored in classifications

## S1-22 · Tue 27 Oct · Mihlali

**Story:** As a driver, I want to submit a request from my phone, so that I can get help without calling the office.

Scenario 1
- Given I am on a 360px-wide phone screen
- When I open the submit form
- Then I can fill in subject, description and depot without zooming

Scenario 2
- Given I leave the description empty
- When I tap Submit
- Then I see "Please describe your request" and the form is not sent

Scenario 3
- Given I fill in every field
- When I tap Submit
- Then I see a reference number and the department my request went to

## S1-23 · Tue 27 Oct · Baphakamise

**Story:** As an agent, I want to edit the AI draft and then send it, so that I stay in control of what goes out.

Scenario 1
- Given I open a ticket with an AI draft
- When the draft loads
- Then it is marked "AI-drafted"

Scenario 2
- Given I edit the draft
- When I click Send
- Then the edited text is sent
- And the ticket status becomes Answered with the time recorded

## S1-24 · Wed 28 Oct · Samukelo

**Story:** As a new team member, I want the request flow, security and future plans written down, so that I understand how a ticket moves through Relay and how it will grow.

Scenario 1
- Given the architecture document
- When a new team member reads it
- Then they can follow a ticket from submit to reply
- And see which role can access what
- And how the design supports the later sprints

## S1-25 · Wed 28 Oct · Elzel

**Story:** As an agent, I want unsure classifications flagged, so that wrongly routed tickets are caught.

Scenario 1
- Given a request is classified with confidence below 0.6
- When it is saved
- Then it is marked "Needs review"

Scenario 2
- Given a ticket marked "Needs review"
- When I change its department
- Then it moves to the new department's inbox
- And the change is saved with my name and the time

## S1-26 · Wed 28 Oct · Mihlali

**Story:** As a staff member, I want to see my requests and their status, so that I don't have to chase anyone on WhatsApp.

Scenario 1
- Given I have submitted requests
- When I open My requests
- Then I see them newest first, each with its status in words and colour

Scenario 2
- Given I open one request
- When the detail page loads
- Then I see its department, status history and the reply once one is sent

## S1-27 · Wed 28 Oct · Baphakamise

**Story:** As an agent, I want a template library screen, so that I can view and update the reply templates.

Scenario 1
- Given I am an agent
- When I open Templates
- Then I see the templates grouped by department

Scenario 2
- Given I edit a template
- When I click Save
- Then the next AI draft uses the updated wording

## S1-28 · Wed 28 Oct · Baphakamise

**Story:** As a staff member, I want to see the agent's reply on my request, so that I get my answer in one place.

Scenario 1
- Given an agent has sent a reply to my request
- When I open that request
- Then I see the reply and the time it was sent
- (Tested together with Mihlali)

## Team · Thu 29 Oct · All members

**Story:** As the team, I want to test the full journey on the live site, so that we know it works before the demo.

Scenario 1
- Given the live site on a phone
- When a driver submits a request and an agent switches tone, edits and sends a reply
- Then the driver sees the reply on their request
- And every bug found is logged in Jira and fixed

## Team · Fri 30 Oct · All members

**Story:** As the team, I want to demo our work and reflect on the sprint, so that we get feedback and improve in Sprint 2.

Scenario 1
- Given the sprint review
- When the team presents the demo
- Then the full journey is shown live
- And Jira stories are updated
- And the retro note (what went well, what to change) is saved in docs/sprints

