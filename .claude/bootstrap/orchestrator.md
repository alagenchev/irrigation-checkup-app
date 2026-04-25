# Orchestrator Bootstrap

Run this sequence at the start of every session before doing anything else.

## Step 1 — Confirm Environment

```bash
pwd                          # Must be inside irrigation-checkup-app/
git status                   # Note any uncommitted changes
git log --oneline -3         # Note last few commits for context
```

If `pwd` is not inside the repo, stop and tell the user.

## Step 2 — Load Memory

Read these files in order:

1. `~/.claude/projects/.../memory/MEMORY.md` — Index of all memory
2. `~/.claude/projects/.../memory/agent_model_preferences.md` — Which model each agent uses
3. `~/.claude/projects/.../memory/task_tracking_system.md` — Task conventions

## Step 3 — Check for In-Progress Work

```bash
grep -r "in_progress" .claude/plans/*/status.md 2>/dev/null
grep -r "WAITING_FOR_USER" .claude/plans/*/status.md 2>/dev/null
```

- If any task is `in_progress` → report it to user, ask if they want to resume
- If any task has `WAITING_FOR_USER` → surface those questions immediately
- If all tasks are `pending` → ask user which task to start

## Step 4 — Verify Playwright Setup

Before any task can reach the UI Test phase, Playwright must be configured:

```bash
ls playwright.config.ts 2>/dev/null && echo "FOUND" || echo "MISSING"
ls e2e/ 2>/dev/null && echo "FOUND" || echo "MISSING"
cat package.json | grep playwright
```

If Playwright is **missing**, do this once and save the result in the active task's `context.md`:

```bash
npm install --save-dev @playwright/test @clerk/testing
npx playwright install chromium
```

Then create `playwright.config.ts`:
```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
```

Create `e2e/` directory and add `e2e/.gitkeep`.

Add to `package.json` scripts:
```json
"test:e2e": "playwright test"
```

Record in `context.md`: `Playwright configured: true, date: {today}`

## Step 5 — Load Model Preferences

Read `agent_model_preferences.md`. These are the models to use when spawning agents:
- Orchestrator (you): as set by user (`/model` command)
- Coding Agent: from preferences file
- Testing Agent: from preferences file
- UI Test Agent: from preferences file
- QA Agent: from preferences file

## Step 6 — Report to User

Tell the user:
- Current task state (in-progress / pending / completed)
- Any pending questions that need answers
- What you're ready to do next

Then wait for their instruction.

## Failure Rule

If any step above fails 3 times in a row, stop and ask the user what to do. Never silently loop.

---

## Session Resume (Mid-Task)

If resuming a task that was in-progress:

1. Read `status.md` for the task
2. Read `context.md` for the task (decisions made so far)
3. Identify the current phase and its state
4. Surface any `WAITING_FOR_USER` questions
5. Summarize current state to user
6. Ask: "Should I continue from where we left off?"
