# Getting started with Relay

This guide takes you from a fresh laptop to running Relay and opening your first pull request. It takes about 30–45 minutes. Do it once; after that, use the **Daily workflow** section.

Commands are for **Windows Command Prompt** (cmd). Mac notes are in brackets where they differ.

---

## Before you start: three rules

These avoid the problems the team has already run into.

1. **Use a normal Command Prompt, not Administrator.** Press the **Windows key**, type `cmd`, press **Enter**. Don't choose "Run as administrator".
   - ✅ Right: the prompt starts with `C:\Users\<your name>>`
   - ❌ Wrong: the prompt starts with `C:\WINDOWS\system32>`. Close it and open a normal one.
2. **Run one command at a time.** Copy one line, paste it, press **Enter**, and wait for it to finish before the next. Typing two commands on one line (like `code --versiongit --version`) runs only the first one. The word `cmd` at the top of each box is a label; don't type it.
3. **Never share secret values.** Before sending a screenshot of Supabase, Vercel or `.env.local`, cover the values. Names like `SUPABASE_SERVICE_ROLE_KEY` are fine to show; what comes after the `=` is not.

---

## 1. Accounts

| Account | What to do |
| --- | --- |
| **GitHub** | Create a free account at [github.com](https://github.com) if you don't have one. Send your username to Samukelo, then **accept the invite email** to the `mngadisamu/relay` repo. You can't push code until you accept it. |

You don't need Supabase, Vercel or Gemini accounts. Samukelo sends you the keys privately (step 7).

---

## 2. Install the tools

You already have **Git**. Install Node.js and VS Code with `winget`, Windows' built-in installer.

**2.1** In Command Prompt, run each line on its own:

```cmd
winget install --id OpenJS.NodeJS.LTS -e
```

```cmd
winget install --id Microsoft.VisualStudioCode -e
```

- If winget asks you to accept the source agreements, type `Y` and press **Enter**.
- If it says **"Found an existing package already installed"**, that's fine. It's already there; carry on.

**2.2 Close every Command Prompt window, then open a new one.** Windows only finds newly installed programs in new windows. Skipping this is the most common reason for `'node' is not recognized`.

**2.3** Check each tool, **one line at a time**:

```cmd
git --version
```

```cmd
node --version
```

```cmd
npm --version
```

```cmd
code --version
```

Each should print a version number, e.g. `git version 2.47.0`, `v22.11.0`, `10.9.0`, `1.142.0`. Node must be **v20 or higher**.

> **`'node' is not recognized`, even after opening a new window?**
> Run `"C:\Program Files\nodejs\node.exe" --version` (with the quotes).
> - If it prints a version, Node is installed but Windows hasn't updated its path yet. **Restart your laptop**, then try `node --version` again.
> - If it says *"The system cannot find the path specified"*, reinstall: run `winget uninstall --id OpenJS.NodeJS.LTS -e`, then `winget install --id OpenJS.NodeJS.LTS -e`, then open a new Command Prompt.

**2.4** Install the VS Code extensions, one line at a time:

```cmd
code --install-extension dbaeumer.vscode-eslint
```

```cmd
code --install-extension bradlc.vscode-tailwindcss
```

```cmd
code --install-extension esbenp.prettier-vscode
```

These highlight code mistakes (ESLint), autocomplete Tailwind classes, and tidy your code on save (Prettier).

> **On a Mac?** Install with Homebrew: `brew install node` and `brew install --cask visual-studio-code`. The `code --install-extension` commands are the same.

---

## 3. Tell Git who you are

Run these once, with your own name and the email on your GitHub account:

```cmd
git config --global user.name "Your Name"
```

```cmd
git config --global user.email "you@example.com"
```

---

## 4. Get the code

Run each line on its own in Command Prompt:

```cmd
mkdir %USERPROFILE%\Projects
```

(If it says *"A subdirectory or file … already exists"*, that's fine.)

```cmd
cd %USERPROFILE%\Projects
```

```cmd
git clone https://github.com/mngadisamu/relay.git
```

Check it worked:

```cmd
dir relay
```

You should see files like `package.json`, `README.md` and a `src` folder.

---

## 5. Open the project in VS Code

1. Open **VS Code** from the Start menu.
2. Click **File → Open Folder…**
3. Go to `C:\Users\<your name>\Projects\relay`, click it once, then click **Select Folder**.
4. If VS Code asks *"Do you trust the authors of the files in this folder?"*, click **Yes, I trust the authors**.

> **Shortcut:** from Command Prompt, `cd %USERPROFILE%\Projects\relay` then `code .` does the same thing. If nothing opens, use the steps above instead.

---

## 6. Switch VS Code's terminal to Command Prompt

**Do this before running anything in VS Code.** Its terminal starts as PowerShell, which blocks `npm` on many laptops with the error *"npm.ps1 cannot be loaded because running scripts is disabled on this system"*.

1. Open the terminal: **Terminal → New Terminal** (or **Ctrl+`**).
2. In the terminal panel's top-right, click the **⌄** next to the **+**.
3. Click **Select Default Profile** → **Command Prompt**.
4. Close the current terminal with the **🗑 bin icon**, then open a new one (**Ctrl+`**).

Check it worked:
- ✅ Right: `C:\Users\<your name>\Projects\relay>`
- ❌ Wrong: `PS C:\Users\...` (the `PS` means it's still PowerShell; repeat the steps)

From here on, run every command in **this VS Code terminal**.

---

## 7. Install the project's packages

```cmd
npm install
```

This downloads everything the app needs into a `node_modules` folder and takes a few minutes. Yellow warnings are normal; red **ERR!** lines are not (see Troubleshooting).

---

## 8. Add the secret keys

The app needs keys for Supabase and Gemini. **Keys never go into Git**, so each person keeps their own copy in a file called `.env.local`.

**8.1** In the VS Code terminal, make a copy of the template:

```cmd
copy .env.example .env.local
```

It should print `1 file(s) copied.` (Mac: `cp .env.example .env.local`)

**8.2** In VS Code's **Explorer** sidebar on the left, click **`.env.local`** to open it.

**8.3** Paste in the values Samukelo sends you privately. Put each value **straight after the `=`: no spaces and no quotes**:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxxxxx
GEMINI_API_KEY=xxxxxxxx
```

- ❌ `NEXT_PUBLIC_SUPABASE_URL = https://...` (spaces around `=`)
- ❌ `NEXT_PUBLIC_SUPABASE_URL="https://..."` (quotes)
- ❌ `https://abcdefghijklmnop.supabase.co/` (slash at the end of the URL)
- **Keep the names exactly as they are in the file**, even if Supabase's own screens call the key something else, such as "publishable key".

**8.4** Save the file (**Ctrl+S**).

`.env.local` won't appear in VS Code's **Source Control** panel. That's correct: Git ignores it, which is how the keys stay out of GitHub.

---

## 9. Run Relay

```cmd
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You should see the **Relay** home page.

- Leave the terminal running while you work. The page updates automatically when you save a file.
- Stop the app with **Ctrl+C** in the terminal.
- **After changing `.env.local`, stop and restart `npm run dev`.** It only reads the keys when it starts.

**Check the classify API (optional).** Open a second terminal with the **+** and run:

```cmd
curl -X POST http://localhost:3000/api/classify -H "Content-Type: application/json" -d "{\"subject\":\"Laptop broken\",\"description\":\"My laptop will not turn on\"}"
```

(Mac: `curl -X POST http://localhost:3000/api/classify -H "Content-Type: application/json" -d '{"subject":"Laptop broken","description":"My laptop will not turn on"}'`)

You should get back `"department":"IT"`. This is the test version of the classifier until Elzel's real model replaces it.

---

## 10. Find your way around

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

## 11. Daily workflow

Every story follows the same seven steps. **Never work directly on `main`.**

**1. Get the latest code**
```cmd
git checkout main
```
```cmd
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
```
```cmd
git commit -m "S1-22 Add depot field to submit form"
```
Commit small and often, e.g. every time one scenario works.

**5. Push your branch to GitHub**
```cmd
git push -u origin feature/S1-22-submit-form
```
The first time you push, a GitHub sign-in window opens. Sign in with your browser.

**6. Open a pull request.** GitHub shows a yellow **Compare & pull request** button. Fill in the template, then ask a teammate to review. Vercel adds a **preview link** to the pull request so they can test it live.

**7. After approval,** click **Squash and merge**, then delete the branch. Update your story's **Completion** column in the sprint plan to Done.

### Keeping your branch up to date

If `main` changed while you were working, run each line in turn:
```cmd
git checkout main
```
```cmd
git pull
```
```cmd
git checkout feature/S1-22-submit-form
```
```cmd
git merge main
```

---

## 12. Troubleshooting

| Problem | Fix |
| --- | --- |
| Prompt starts with `C:\WINDOWS\system32>` | It's an administrator window. Close it and open a normal Command Prompt (Windows key → `cmd` → Enter). |
| `'node' is not recognized` (or `npm`, `code`) | Close **all** Command Prompt and VS Code windows and open a new one. Still failing? See the box under step 2.3, or restart your laptop. |
| winget says *"Found an existing package already installed"* but `node` isn't recognized | Node is installed but not found yet. Restart your laptop. If `"C:\Program Files\nodejs\node.exe" --version` fails too, reinstall it (step 2.3 box). |
| `'winget' is not recognized` | Update **App Installer** from the Microsoft Store, then try again. Or download Node.js from [nodejs.org](https://nodejs.org) (LTS) and VS Code from [code.visualstudio.com](https://code.visualstudio.com). |
| `Warning: '…' is not in the list of known options` | Two commands were typed on one line. Run each command on its own line. |
| `code .` does nothing | Open the folder from VS Code instead: **File → Open Folder…** (step 5). |
| `npm.ps1 cannot be loaded because running scripts is disabled on this system` | VS Code's terminal is still PowerShell. Redo step 6. Quick workaround: type `npm.cmd` instead of `npm`. |
| `npm install` shows red **ERR!** lines | Check `node --version` is 20 or higher. Delete the `node_modules` folder and run `npm install` again. |
| `The system cannot find the file specified` when copying `.env.example` | You're not in the `relay` folder. Run the command in VS Code's terminal (step 6), or `cd %USERPROFILE%\Projects\relay` first. |
| Errors mentioning `SUPABASE_URL` or `undefined` keys | `.env.local` is missing, a value is empty, or there are spaces or quotes around a value. Check step 8.3, save, then stop and restart `npm run dev`. |
| `Port 3000 is already in use` | Another copy of the app is running. Close the other terminal, or use the address the terminal suggests (e.g. `localhost:3001`). |
| `Permission denied` or `403` when pushing | Accept the GitHub invite email, then try again. |
| Push rejected: `protected branch` | You're on `main`. Create a branch (daily workflow step 2) and push that instead. |
| `CONFLICT` when merging `main` into your branch | Don't panic. VS Code highlights the conflicting lines. If you're unsure which version to keep, ask the person who wrote the other change at stand-up. |
| A secret value was shared in a screenshot, chat or commit | Tell Samukelo straight away so the key can be replaced in Supabase. Deleting the message or commit isn't enough. |

---

## 13. Getting help

1. Read the error message carefully. The first red line usually says what's wrong.
2. Check the Troubleshooting table above, or paste the error to an AI assistant.
3. Still stuck after 30 minutes? Say so at stand-up or message the team. Being blocked for a day costs the whole sprint.
