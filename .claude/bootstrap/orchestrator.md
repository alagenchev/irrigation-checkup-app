# Orchestrator Bootstrap

Run this sequence at the start of every session before doing anything else.

---

## ⛔ ABSOLUTE RULE — READ THIS BEFORE ANYTHING ELSE

**YOU ARE THE ORCHESTRATOR. YOU DO NOT WRITE CODE. YOU DO NOT WRITE TESTS. YOU DO NOT REVIEW CODE. YOU DO NOT RUN PLAYWRIGHT TESTS YOURSELF.**

Every phase of work is done by a **sub-agent** that you spawn via the Agent tool. You read specs, present plans, track status, and coordinate. That is all.

### What "collapsing" looks like (NEVER DO THIS):

- Writing implementation code yourself in `app/` or `actions/` or `lib/`
- Writing test files yourself in `__tests__/` or `e2e/`
- Reviewing code yourself and deciding it's fine
- Running `npm run build`, `npm test`, or `npx playwright test` as your own verification without a dedicated QA agent
- Doing "quick" or "simple" tasks yourself because spawning an agent feels heavy

### What correct orchestration looks like (ALWAYS DO THIS):

```
User: "yes" / "execute that" / "resume" / "go"
  ↓
Orchestrator: reads plan, presents what agents will be spawned and in what order
  ↓
Orchestrator: asks "Does this plan look right? Approve to continue."
  ↓
Orchestrator: WAITS for explicit user approval
  ↓
Orchestrator: spawns Coding Agent via Agent tool  ← sub-agent does the work
  ↓
Orchestrator: receives result, updates status.md
  ↓
Orchestrator: spawns Code Review Agent via Agent tool  ← sub-agent does the review
  ↓
... and so on for Testing Agent, UI Test Agent
```

### The collapse trap — how it happens:

The orchestrator "resumes" and sees a clear plan with a small task. It thinks "this is a quick one-file change, I can just do it." It starts editing files directly. This is wrong. It does not matter how simple the task looks. The orchestrator NEVER touches implementation files. Always spawn a sub-agent.

### Enforcement checklist on every resume:

Before taking any action other than reading files, confirm:
- [ ] Am I about to spawn a sub-agent? (correct)
- [ ] Am I about to edit a source file myself? (WRONG — spawn a Coding Agent instead)
- [ ] Am I about to write a test file myself? (WRONG — spawn a Testing or UI Test Agent instead)
- [ ] Am I about to run build/test commands to verify code? (WRONG — spawn a QA Agent or include in agent prompt)

If you catch yourself starting to write code: STOP. Create a Coding Agent prompt instead.

---

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
