# Coding Agent Bootstrap

Run this at the start of your work before writing any code.

## Step 1 — Confirm Environment

```bash
pwd                          # Must be inside irrigation-checkup-app/
node --version               # Verify Node is available
npm --version
```

## Step 2 — Read Project Conventions

Read these files before touching anything:

```bash
cat AGENTS.md                # All project conventions — your style guide
cat CLAUDE.md                # Additional project instructions
```

Key things to internalize from AGENTS.md:
- Multi-tenancy: every DB query must include `companyId`
- TypeScript strict: no `any`, no default exports for components
- Server Actions for mutations, Server Components for data fetching
- File naming: `kebab-case.tsx`, component exports: `PascalCase`

## Step 3 — Understand the Data Model

```bash
cat lib/schema.ts            # All table definitions — know the shape of data
cat lib/validators.ts        # All Zod schemas — use existing ones
cat types/index.ts           # All shared types
```

## Step 4 — Study Existing Patterns

Before writing new code, find a similar existing feature and read it:

```bash
ls actions/                  # Existing server actions
ls app/                      # Existing pages and components
ls components/               # Existing UI components
```

Read one or two existing server actions and components that are similar to what you're building. Match their patterns exactly.

## Step 5 — Read Task Specification

```bash
cat .claude/plans/{task}/README.md     # Task overview
cat .claude/plans/{task}/coding.md     # Detailed implementation spec
cat .claude/plans/{task}/context.md    # Decisions already made (if resuming)
```

If `context.md` has prior decisions, respect them — don't re-litigate architecture decisions already made.

## Step 6 — Establish Baseline

```bash
npm run build                # MUST pass before you change anything
npm test                     # MUST pass before you change anything
```

If either fails before you've written a line: stop, report to orchestrator. You don't own those failures.

## Step 7 — Verify Ready

Confirm:
- [ ] Environment confirmed, correct directory
- [ ] AGENTS.md read and understood
- [ ] Data model understood (schema.ts, validators.ts)
- [ ] Existing patterns studied
- [ ] Task spec read (README.md + coding.md)
- [ ] Baseline build and tests pass
- [ ] context.md checked for prior decisions

You are now ready to write code.

## data-testid Convention

**Always add `data-testid` attributes to key interactive elements** so UI Test Agent can write stable selectors.

Convention: `data-testid="{component-name}-{element-role}"`

Examples:
```tsx
<div data-testid="site-selector">
  <input data-testid="site-selector-search" />
  <button data-testid="site-selector-mode-toggle">New Site</button>
  <ul data-testid="site-selector-results">
    <li data-testid="site-selector-result-item">...</li>
  </ul>
</div>
```

Document every `data-testid` you add in `context.md` under a "Test IDs" section. The UI Test Agent reads this.

## Periodic Save Protocol

**After each significant step, write your current progress to `.claude/plans/{task}/status.md`.**

Significant steps = after each file you finish writing, after each `npm run build` check, after any architecture decision. The goal: if this session is interrupted (token limit, crash, disconnect), the next session can resume exactly where you left off without re-doing work.

Minimum saves:
1. After Step 6 (baseline confirmed): write "Baseline confirmed. Starting implementation."
2. After each file created/modified: write the filename and what you did.
3. After `npm run build` passes: write "Build passing. Files done: [list]."
4. Before reporting complete: write full summary.

Format (append to the Coding Phase section):
```
Progress [HH:MM]: {what was just completed}
```

## Failure Rule

If the same build/test error occurs 3 times after your changes, stop and report to orchestrator with:
- Exact error message
- What you tried
- What you think the root cause is

Never silently loop on failures.
