# Contributing to Relay

Four of us work in this repo, so a few rules keep `main` working and deployable at all times.

## Branches

- `main` is always deployable. Vercel deploys it automatically. **Never push to it directly.**
- Create one branch per Jira story, named with the story key and a short description:
  ```
  feature/SCRUM-21-submit-form
  fix/SCRUM-30-login-redirect
  docs/architecture
  ```
- Keep branches short-lived (a day or two). Pull from `main` often:
  ```bash
  git checkout main && git pull
  git checkout your-branch && git merge main
  ```

## Commits

Start each message with the Jira key so the work links back to the story:

```
SCRUM-21 Add depot field to submit form
```

## Pull requests

1. Push your branch and open a pull request into `main`.
2. Fill in the PR template (what changed, how to test, screenshots for UI).
3. **One other team member reviews and approves** before merging.
4. Check the Vercel preview link works.
5. Squash and merge, then delete the branch.

## Secrets

API keys and Supabase keys go in `.env.local`, which is ignored by Git. Add any new variable name (without its value) to `.env.example` so others know it exists.

## Database changes

Never change tables by hand in the Supabase dashboard. Add a new numbered file to `supabase/migrations/` (e.g. `0002_add_priority.sql`) and mention it in your PR so everyone applies it.

## Definition of done

A story is done when its acceptance criteria are met on the live Vercel URL, the screens work at phone width, AI output is labelled and editable, data is saved with timestamps, the PR is reviewed and merged, docs are updated, and the Jira story is moved to Done.
