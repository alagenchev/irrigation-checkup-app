# Code Review Agent Bootstrap

Run this at the start of every review before reading a single file of implementation code.

## Step 1 — Confirm Environment

```bash
pwd                          # Must be inside irrigation-checkup-app/
git status                   # Know what files changed
git diff HEAD~1 --name-only  # Quick list of changed files (if single commit)
```

## Step 2 — Read Project Conventions

You are reviewing against these standards — read them before looking at the code:

```bash
cat AGENTS.md                # All project conventions — your checklist
cat CLAUDE.md                # Additional project instructions
```

Internalize the review criteria from AGENTS.md:
- Multi-tenancy: `getRequiredCompanyId()` at top of every Server Action
- TypeScript strict: no `any`, no implicit `unknown`, all types explicit
- No default exports on components — named exports only
- File naming: `kebab-case.tsx`, component names: `PascalCase`
- Server Actions: verb prefix (createX, getX, updateX, deleteX)
- No `console.log` or debug code
- Dependency injection: core logic injectable, Server Action is thin wrapper

## Step 3 — Read Task Specification

```bash
cat .claude/plans/{task}/README.md     # What was supposed to be built
cat .claude/plans/{task}/coding.md     # Detailed requirements you're reviewing against
cat .claude/plans/{task}/context.md    # Coding Agent's architecture decisions
```

Understand **intent** before reviewing code — you are checking whether the implementation matches the spec, not rewriting it to your preference.

## Step 4 — Read All Changed Files

From `context.md`, get the list of files created/modified. Read every one:

```bash
cat {each file listed in context.md under "Files Created/Modified"}
```

Do not skim. Read fully. Violations are often subtle.

## Step 5 — Check Baseline Still Passes

```bash
npm run build 2>&1 | tail -20    # TypeScript must compile
npm test 2>&1 | tail -20         # Existing tests must still pass
```

If either fails: record as a blocker before reviewing anything else.

## Step 6 — Verify Ready

Confirm:
- [ ] Project conventions read (AGENTS.md)
- [ ] Task spec read (README.md + coding.md)
- [ ] context.md read (Coding Agent's decisions)
- [ ] All changed files read fully
- [ ] Build + test baseline checked

You are now ready to write the review.

## Failure Rule

If `npm run build` or `npm test` crashes (not fails, but crashes the tool) 3 times:
- Stop
- Report environment issue to orchestrator
- Do not continue the review — you cannot verify against a broken baseline
