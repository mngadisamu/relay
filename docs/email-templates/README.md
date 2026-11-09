# Relay's emails

Supabase sends Relay's account emails: the **invite** (Manage users, S2-25) and **choose a new password** (Forgot your
password and Send password reset, S2-36). These files are Relay's own designs for them, with the navy header from
`public/email/header.png`.

| File | Paste into (Supabase → Authentication → Emails) | Subject |
| --- | --- | --- |
| [`invite.html`](invite.html) | **Invite user** | You're invited to Relay |
| [`reset-password.html`](reset-password.html) | **Reset password** | Choose a new Relay password |

The header image loads from the live site (`https://relay-gilt-nine.vercel.app/email/header.png`), so it only appears
once `public/email/header.png` is merged to `main`.

## Step 1: your own email server (custom SMTP)

Supabase only lets you edit email templates once the project sends email through its own server. That also removes the
built-in limits: without it, emails only reach people on the Supabase team, a few an hour.

The simplest server for the bootcamp is a Gmail account:

1. Use a Gmail account for the team (for example a new `relay.kopano@gmail.com`), with **2-Step Verification** switched on
   (Google Account → Security).
2. In that Google Account, go to **Security → App passwords**, create one called "Relay Supabase", and copy the 16-letter
   password. **Paste it only into Supabase** (step 3): never into chat, code, docs or Git.
3. In Supabase → **Authentication → Emails → SMTP Settings**, switch on **Enable custom SMTP** and fill in:

   | Field | Value |
   | --- | --- |
   | Sender email | the Gmail address |
   | Sender name | `Relay · Kopano Freight` |
   | Host | `smtp.gmail.com` |
   | Port | `587` |
   | Username | the Gmail address |
   | Password | the app password from step 2 |

4. Save. Under **Authentication → Rate Limits**, set the emails-per-hour limit to about 30.

Gmail allows about 500 emails a day, plenty for testing and the showcase. A real company would use its own domain and an
email service (for example Resend or SendGrid) instead.

## Step 2: paste the templates

For each row of the table above: open the template in Supabase, set the **Subject**, open **Source**, delete what's there,
paste the whole file, and **Save**. Then send yourself one of each to check:

- **Invite:** Manage users → Add a person, with your own email.
- **Reset:** Sign in → Forgot your password?, with your own email.

Both buttons use `{{ .ConfirmationURL }}`: Supabase checks the link, then sends the person to Relay's `/auth/confirm`,
which signs them in and opens Welcome or Choose a new password.
