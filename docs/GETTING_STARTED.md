# Getting started with Relay

This guide takes you from a fresh laptop to running Relay and opening your first pull request. It takes about 30–45 minutes. Do it once; after that, use the **Daily workflow** section.

Commands are for **Windows Command Prompt** (cmd). Mac notes are in brackets where they differ.

**Two tips before you start:**
- Open a **normal** Command Prompt (Windows key → type `cmd` → Enter), not "Run as administrator". If your prompt starts with `C:\WINDOWS\system32>`, it's an admin window.
- Paste and run commands **one line at a time**, so you can see which one fails. The word `cmd` at the top of each box is just a label; don't type it.

---

## 1. Accounts

| Account | What to do |
| --- | --- |
| **GitHub** | Create a free account at [github.com](https://github.com) if you don't have one. Send your username to Samukelo, then **accept the invite email** to the `mngadisamu/relay` repo. You can't push code until you accept it. |

You don't need Supabase, Vercel or Gemini accounts. Samukelo shares the keys with you (step 6).

---

## 2. Install the tools

You already have **Git**. Install the other two from **Command Prompt** using `winget`, Windows' built-in installer. Open Command Prompt (press **Windows key**, type `cmd`, press **Enter**) and run:

```cmd
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Microsoft.VisualStudioCode -e
```

- **Node.js LTS** runs the app; npm comes with it.
- **VS Code** is where you write the code.
- If winget asks you to accept the source agreements, type `Y` and press **Enter**.

**Close Command Prompt and open a new one**, then check everything is installed:

```cmd
git --version
node --version
npm --version
code --version
```

Each command should print a version number. Node must be **v20 or higher**.

### VS Code extensions

Install these from the same Command Prompt:

```cmd
code --install-extension dbaeumer.vscode-eslint
code --install-extension bradlc.vscode-tailwindcss
code --install-extension esbenp.prettier-vscode
```

- **ESLint** highlights code mistakes
- **Tailwind CSS IntelliSense** autocompletes Tailwind classes
- **Prettier** tidies your code on save

> **On a Mac?** Install with Homebrew instead: `brew install node` and `brew install --cask visual-studio-code`. The `code --install-extension` commands are the same.

---

## 3. Tell Git who you are

Run these once, with your own name and the email on your GitHub account:

```cmd
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

---

## 4. Get the code

1. We'll keep projects in `C:\Users\<you>\Projects` (Mac: `~/Projects`). If the folder already exists, `mkdir` just says so; carry on.
2. Open Command Prompt, go to that folder and clone the repo:

```cmd
mkdir %USERPROFILE%\Projects
cd %USERPROFILE%\Projects
git clone https://github.com/mngadisamu/relay.git
cd relay
code .
```

The last command opens the project in VS Code. **If VS Code doesn't open**, run `dir` to check the files are there (you should see `package.json`), then open VS Code from the Start menu → **File → Open Folder…** → `C:\Users\<you>\Projects\relay` → **Select Folder**, and click **Yes, I trust the authors** if asked.

From now on you can use VS Code's built-in terminal: **Terminal → New Terminal** (or **Ctrl+`**). **Switch it to Command Prompt before running anything**, because PowerShell blocks `npm` on many laptops: click the **⌄** next to the **+** in the terminal panel → **Select Default Profile** → **Command Prompt**.

The first time you push, a GitHub sign-in window opens. Sign in with your browser.

---

## 5. Install the project's packages

In the VS Code terminal, inside the `relay` folder:

```cmd
npm install
```

This downloads everything the app needs into a `node_modules` folder. It can take a few minutes. Warnings are normal; red **ERR!** lines are not (see Troubleshooting).

---

## 6. Add the secret keys

The app needs keys for Supabase and Gemini. **Keys never go into Git**, so each person keeps their own copy in a file called `.env.local`.

1. Make a copy of the template:

   ```cmd
   copy .env.example .env.local
   ```

   (Mac/Linux: `cp .env.example .env.local`)

2. Open `.env.local` in VS Code and paste in the values Samukelo sends you **privately** (a direct message, never the group chat, a screenshot or a commit).

> Until the Supabase project is set up on Wed 21 Oct, you can leave the values empty. The app still runs.

---

## 7. Run Relay

```cmd
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You should see the **Relay** home page.

- Leave the terminal running while you work. The page updates automatically when you save a file.
- Stop the app with **Ctrl+C** in the terminal.

**Check the classify API (optional).** In a second terminal:

```cmd
curl -X POST http://localhost:3000/api/classify -H "Content-Type: application/json" -d "{\"subject\":\"Laptop broken\",\"description\":\"My laptop will not turn on\"}"
```

(Mac: `curl -X POST http://localhost:3000/api/classify -H "Content-Type: application/json" -d '{"subject":"Laptop broken","description":"My laptop will not turn on"}'`)

You should get back `"department":"IT"`. This is the test version of the classifier until Elzel's real model replaces it.

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
```cmd
git checkout main
git pull
```

**2. Create a branch for your story.** Use the story ID and a short name:
```cmd
git checkout -b feature/S1-22-submit-form
```

**3. Build and test** at `localhost:3000`. Check the story's Given / When / Then scenarios in the sprint plan one by one.

**4. Save your work in commits.** Start the message with the story ID:
```cmd
git add .
git commit -m "S1-22 Add depot field to submit form"
```
Commit small and often, e.g. every time one scenario works.

**5. Push your branch to GitHub**
```cmd
git push -u origin feature/S1-22-submit-form
```

**6. Open a pull request.** GitHub shows a yellow **Compare & pull request** button. Fill in the template, then ask a teammate to review. Vercel adds a **preview link** to the pull request so they can test it live.

**7. After approval,** click **Squash and merge**, then delete the branch. Update your story's **Completion** column in the sprint plan to Done.

### Keeping your branch up to date

If `main` changed while you were working:
```cmd
git checkout main
git pull
git checkout feature/S1-22-submit-form
git merge main
```

---

## 10. Troubleshooting

| Problem | Fix |
| --- | --- |
| `'npm' is not recognized` or `'code' is not recognized` | Close **all** Command Prompt windows and VS Code, then open a new one. If it still fails, restart your laptop so Windows picks up the new install. |
| `'winget' is not recognized` | Update **App Installer** from the Microsoft Store, then try again. Or download Node.js from [nodejs.org](https://nodejs.org) and VS Code from [code.visualstudio.com](https://code.visualstudio.com). |
| `npm install` shows red **ERR!** lines | Check `node --version` is 20 or higher. Delete the `node_modules` folder and run `npm install` again. |
| `npm.ps1 cannot be loaded because running scripts is disabled on this system` | VS Code's terminal is PowerShell. Switch it to Command Prompt: click **⌄** next to **+** in the terminal panel → **Select Default Profile** → **Command Prompt**, close the old terminal and open a new one. Or type `npm.cmd` instead of `npm`. |
| `code .` does nothing | Make sure you're in a normal (not administrator) Command Prompt and inside the `relay` folder. Or open the folder from VS Code: **File → Open Folder…**. |
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
