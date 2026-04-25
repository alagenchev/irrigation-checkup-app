# Testing Agent Bootstrap

Run this at the start of your work before writing any tests.

## Step 1 — Confirm Environment

```bash
pwd                          # Must be inside irrigation-checkup-app/
cat jest.config.js           # Understand test configuration
cat jest.config.ts 2>/dev/null || true
```

## Step 2 — Read Task Context

Read these files before writing a single test:

```bash
cat .claude/plans/{task}/README.md       # Task overview
cat .claude/plans/{task}/unit-tests.md   # Detailed test specification
cat .claude/plans/{task}/context.md      # Architecture decisions + data-testid list
```

The `context.md` is critical — it contains:
- Architecture decisions from Coding Agent (e.g., "uses controlled component pattern")
- `data-testid` attributes added (useful for component queries)
- Known edge cases to cover
- Files created/modified by Coding Agent

## Step 3 — Read the Actual Code

Don't ask the orchestrator for code. Read it directly:

```bash
# Find what Coding Agent created/modified
cat .claude/plans/{task}/context.md | grep "Files created"
# Then read those files
cat app/components/site-selector.tsx
cat actions/sites.ts
# etc.
```

Understand the code before writing tests. Look for:
- Branch paths (if/else, try/catch) — every branch needs a test
- Injected dependencies — mock these in tests
- Error paths — always test these
- Edge cases visible in the code

## Step 4 — Study Existing Test Patterns

```bash
ls __tests__/                # Existing unit tests
ls __tests__/*.integration.test.ts   # Existing integration tests
```

Read 1-2 existing tests that are similar to what you're testing. Match their patterns:
- Same mock setup style
- Same `withRollback` pattern for integration tests
- Same `jest.mock` conventions
- Same `TEST_COMPANY_ID` usage

## Step 5 — Establish Baseline

```bash
npm test -- --coverage       # Run ALL tests with coverage before you start
```

Record the **baseline coverage** before your new tests. You can only improve from here.

## Step 6 — Verify Ready

- [ ] Environment confirmed, correct directory
- [ ] unit-tests.md read
- [ ] context.md read (architecture decisions, data-testids)
- [ ] Actual code read (not assumed)
- [ ] Existing test patterns studied
- [ ] Baseline coverage recorded

You are now ready to write tests.

## Coverage Command

```bash
# Run only new test files
npm test -- --coverage --testPathPattern="site-selector|irrigation-form"

# Run all tests with full coverage report
npm test -- --coverage --coverageReporters=text

# Run and show which lines are NOT covered
npm test -- --coverage --coverageReporters=text-summary
```

## Iteration Limit (Critical)

You get **3 refactoring loops** with Coding Agent before escalating to the user:

- Loop 1: Write tests → coverage < 90% → send refactoring tasks to Coding Agent
- Loop 2: Coding Agent refactors → re-run tests → still < 90% → send new tasks
- Loop 3: Coding Agent refactors → re-run tests → still < 90% → **STOP**

After 3 loops without hitting 90%, report to orchestrator:
```
⚠️ Coverage loop limit reached (3 iterations)
Current coverage: {X}%
Remaining gaps: [list specific uncovered lines/branches]
Hypothesis: [why coverage is hard to reach — e.g., untestable external dependency]
Options: 
  A) Exclude specific lines from coverage with `/* istanbul ignore next */`
  B) Restructure the component differently
  C) Accept {X}% for this task and document why
Escalating to user for decision.
```

## Failure Rule

If `npm test` itself fails (not coverage, but test errors) 3 times in a row after your changes:
- Stop writing tests
- Report exact error to orchestrator
- Do not guess at fixes
