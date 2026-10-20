# Getting started with Relay

This guide takes you from a fresh laptop to running Relay and opening your first pull request. It takes about 30–45 minutes. Do it once; after that, use the **Daily workflow** section.

Commands are shown for **Windows (PowerShell)**. Mac and Linux notes are in brackets where they differ.

---

## 1. Accounts

| Account | What to do |
| --- | --- |
| **GitHub** | Create a free account at [github.com](https://github.com) if you don't have one. Send your username to Samukelo, then **accept the invite email** to the `mngadisamu/relay` repo. You can't push code until you accept it. |
| **Jira** | Accept the invite to the *Roadmap Planning* project. Your stories are there. |

You don't need Supabase, Vercel or Gemini accounts. Samukelo shares the keys with you (step 6).

---

## 2. Install the tools

Install these three, in this order. Accept the default options in each installer.

1. **Git**: [git-scm.com/downloads](https://git-scm.com/downloads)
2. **Node.js 22 LTS**: [nodejs.org](https://nodejs.org). Choose the **LTS** version, not "Current". npm comes with it.
3. **VS Code**: [code.visualstudio.com](https://code.visualstudio.com)

**Close and reopen** any terminal windows after installing, then check everything works:

```powershell
git --version     # should print git version 2.x
node --version    # should print v20 or higher
npm --version     # should print 10.x or similar
```

### VS Code extensions

In VS Code, open the Extensions panel (**Ctrl+Shift+X**, Mac **Cmd+Shift+X**) and install:

- **ESLint**: highlights code mistakes
- **Tailwind CSS IntelliSense**: autocompletes Tailwind classes
- **Prettier – Code formatter**: tidies your code on save

---

## 3. Tell Git who you are

Run these once, with your own name and the email on your GitHub account:

```powershell
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

---

## 4. Get the code

1. Choose a folder for your projects, e.g. `C:\Users\<you>\Projects` (Mac: `~/Projects`).
2. Open a terminal there and clone the repo:

```powershell
git clone https://github.com/mngadisamu/relay.git
cd relay
code .
```

The last command opens the project in VS Code. From now on you can use VS Code's built-in terminal: **Terminal → New Terminal** (or **Ctrl+`**).

The first time you push, a GitHub sign-in window opens. Sign in with your browser.

---

## 5. Install the project's packages

In the VS Code terminal, inside the `relay` folder:

```powershell
npm install
```

This downloads everything the app needs into a `node_modules` folder. It can take a few minutes. Warnings are normal; red **ERR!** lines are not (see Troubleshooting).

---

## 6. Add the secret keys

The app needs keys for Supabase and Gemini. **Keys never go into Git**, so each person keeps their own copy in a file called `.env.local`.

1. Make a copy of the template:

   ```powershell
   Copy-Item .env.example .env.local
   ```

   (Mac/Linux: `cp .env.example .env.local`)

2. Open `.env.local` in VS Code and paste in the values Samukelo sends you **privately** (a direct message, never the group chat, a screenshot or a commit).

> Until the Supabase project is set up on Wed 21 Oct, you can leave the values empty. The app still runs.

---

## 7. Run Relay

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You should see the **Relay** home page.

- Leave the terminal running while you work. The page updates automatically when you save a file.
- Stop the app with **Ctrl+C** in the terminal.

**Check the classify API (optional).** In a second terminal:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/classify -ContentType "application/json" -Body '{"subject":"Laptop broken","description":"My laptop will not turn on"}'
```

(Mac/Linux: `curl -X POST http://localhost:3000/api/classify -H "Content-Type: application/json" -d '{"subject":"Laptop broken","description":"My laptop will not turn on"}'`)

You should get back `department: IT`. This is the test version of the classifier until Elzel's real model replaces it.

---

## 8. Find your way around

| Folder | What goes there | Mostly used by |
| --- | --- | --- |
| `src/app/` | Pages and API routes. Each folder is a URL, e.g. `src/app/requests/page.tsx` → `/requests` | Mihlali, Baphakamise |
| `src/app/api/` | Server code the pages call, e.g. `/api/classify` | Elzel, Baphakamise |
| `src/lib/` | Shared code, such as the Supabase connection | Samukelo |
| `supabase/migrations/` | Database changes, as numbered `.sql` files | Samukelo |
| `ml/` | Colab notebooks and the exported model | Elzel |
| `data/` | Datasets | Elzel |
| `docs/` | Architecture document, sprint plan, this guide | Everyone |

---

## 9. Daily workflow

Every story follows the same seven steps. **Never work directly on `main`.**

**1. Get the latest code**
```powershell
git checkout main
git pull
```

**2. Create a branch for your story.** Use the story ID and a short name:
```powershell
git checkout -b feature/S1-22-submit-form
```

**3. Build and test** at `localhost:3000`. Check the story's Given / When / Then scenarios in the sprint plan one by one.

**4. Save your work in commits.** Start the message with the story ID:
```powershell
git add .
git commit -m "S1-22 Add depot field to submit form"
```
Commit small and often, e.g. every time one scenario works.

**5. Push your branch to GitHub**
```powershell
git push -u origin feature/S1-22-submit-form
```

**6. Open a pull request.** GitHub shows a yellow **Compare & pull request** button. Fill in the template, then ask a teammate to review. Vercel adds a **preview link** to the pull request so they can test it live.

**7. After approval,** click **Squash and merge**, then delete the branch. Move the story to **Done** in Jira and update the Completion column in the sprint plan.

### Keeping your branch up to date

If `main` changed while you were working:
```powershell
git checkout main
git pull
git checkout feature/S1-22-submit-form
git merge main
```

---

## 10. Troubleshooting

| Problem | Fix |
| --- | --- |
| `'npm' is not recognized` or `'git' is not recognized` | Close **all** terminals and VS Code, then reopen. If it still fails, reinstall Node.js or Git and tick "Add to PATH". |
| `npm install` shows red **ERR!** lines | Check `node --version` is 20 or higher. Delete the `node_modules` folder and run `npm install` again. |
| `Port 3000 is already in use` | Another copy of the app is running. Close the other terminal, or use the address the terminal suggests (e.g. `localhost:3001`). |
| `Permission denied` or `403` when pushing | Accept the GitHub invite email, then try again. |
| Push rejected: `protected branch` | You're on `main`. Create a branch (step 2 of the daily workflow) and push that instead. |
| `CONFLICT` when merging `main` into your branch | Don't panic. VS Code highlights the conflicting lines. If you're unsure which version to keep, ask the person who wrote the other change at stand-up. |
| Errors mentioning `SUPABASE_URL` or `undefined` keys | `.env.local` is missing or a value is empty. Redo step 6, then stop and restart `npm run dev`. |
| You accidentally committed a key | Tell Samukelo straight away so the key can be replaced. Deleting the commit isn't enough. |

---

## 11. Getting help

1. Read the error message carefully. The first red line usually says what's wrong.
2. Search the error text in the project's docs, or paste it to an AI assistant.
3. Still stuck after 30 minutes? Say so at stand-up or message the team. Being blocked for a day costs the whole sprint.
