# Multi-Agent Workflow System

## What This Is

A sophisticated multi-agent orchestration system for implementing features with:
- **Orchestrator** (Claude): Plans, delegates, coordinates
- **Coding Agent**: Senior engineer (clean code, DI, testable)
- **Testing Agent**: Test specialist (90%+ coverage enforcement)
- **UI Test Agent**: E2E specialist (Playwright tests)
- **QA Agent**: QA gatekeeper (verification, sign-off)

## How It Works

```
User Request
  ↓
Orchestrator reads task plan
  ↓
Spawn Coding Agent → Implements code
  ↓
Spawn Testing Agent → Writes tests (90%+ coverage required)
  ↓
Spawn UI Test Agent → Writes Playwright E2E tests
  ↓
Spawn QA Agent → Verifies locally, signs off
  ↓
Orchestrator commits + pushes
```

## Getting Started

### Next Session: Resume Work

When you start a new Claude session:

```
You: "Resume multi-agent workflow for site-selector-ui"

I will:
1. Read memory files with all agent instructions
2. Check status.md for current progress
3. Continue from last checkpoint
4. Relay any pending questions
```

### Start a New Task

```
You: "Start site-selector-ui task"

I will:
1. Spawn Coding Agent
2. Monitor all four phases
3. Update status.md every 15-30 minutes
4. Ask you questions if needed
5. Commit when complete
```

## Where Everything Is Saved

### Memory Files (Persist Across Sessions)
All in: `~/.claude/projects/.../memory/`

**Orchestrator & Planning**:
- `orchestrator_role.md` — Your role as orchestrator
- `multi_agent_workflow.md` — How agents coordinate

**Agent Instructions**:
- `coding_agent_instructions.md` — Coding Agent role
- `testing_agent_instructions.md` — Testing Agent role
- `ui_test_agent_instructions.md` — UI Test Agent role
- `qa_agent_instructions.md` — QA Agent role

**Usage & Reference**:
- `HOW_TO_USE_THIS_SYSTEM.md` — User guide ⭐ START HERE
- `task_tracking_system.md` — Task tracking overview
- `MEMORY.md` — Index of all memory files

### Task Plans
All in: `.claude/plans/{task-name}/`

Each task has:
- `README.md` — Overview
- `coding.md` — What to implement
- `unit-tests.md` — What tests to write
- `ui-tests.md` — What UI scenarios to test
- `status.md` — Real-time progress tracking ⭐ CHECK THIS
- `QA_REPORT.md` — QA findings (after QA phase)

### Git History
```bash
git log --grep="{task-name}"    # See all commits for a task
git log --oneline              # See recent commits
```

## Monitoring Progress

### Quick Status Check
```
You: "What's the status of site-selector-ui?"

Response shows:
- Current phase (Coding/Testing/UI Tests/QA)
- Owner/agent working on it
- Coverage % (for testing phase)
- Blockers or questions
- Time estimate
```

### Direct Status File
```bash
cat .claude/plans/site-selector-ui/status.md
```

### QA Report (After QA Phase)
```bash
cat .claude/plans/site-selector-ui/QA_REPORT.md
```

## Key Workflow Rules

1. **90% Code Coverage**: Non-negotiable (Testing Agent enforces)
2. **QA Sign-Off**: Required before commit
3. **User Approval**: You must approve final commit
4. **Status Persistence**: Updated every 15-30 min to survive disconnects
5. **Agents Only Talk to Orchestrator**: No direct agent-to-agent communication

## Tasks Available

| Task | UUID | Status | Blocks |
|------|------|--------|--------|
| site-selector-ui | f47ac10b-... | pending | link-irrigation-fields |
| link-irrigation-fields | 8f5d8c1a-... | pending | — |
| sites-menu-irrigation | c9e3a2f1-... | pending | — |
| site-irrigation-refactor | a1f2b3c4-... | pending | All above 3 |

See: `memory/tasks.md` for full details with UUIDs and dependencies.

## Example: Start site-selector-ui

```
You: "Start site-selector-ui task"

Orchestrator:
✓ Task spec loaded
✓ Spawning Coding Agent...

(Agent works, you see updates every 15-30 min)

You: "What's the status?"

Orchestrator:
✅ Coding: Completed (2 hours)
⏳ Unit Tests: In Progress (78% coverage, refactoring...)
📋 UI Tests: Pending
📋 QA: Pending

(Testing Agent refactors code, re-runs tests)

Orchestrator:
✅ Testing: Completed (92% coverage)

(UI Test Agent writes tests)

Orchestrator:
✅ UI Tests: Completed

(QA Agent verifies locally)

Orchestrator:
✅ QA: Completed & Approved

Ready to commit and push?

You: "Yes"

Orchestrator:
✓ Moved to completed/
✓ Committed and pushed
✓ Task complete!
```

## Using Different Models for Agents

See: [Using Different Models](#using-different-models-for-agents-section-below)

---

## Using Different Models for Agents

You can specify which Claude model each agent uses:

### Available Models
- `haiku` — Fast, lightweight (default)
- `sonnet` — Balanced, recommended for most work
- `opus` — Most capable, best for complex tasks

### How to Specify Models

When starting a task, tell me which models to use:

```
You: "Start site-selector-ui task
  - Coding Agent: use opus (most capable)
  - Testing Agent: use sonnet (good at tests)
  - UI Test Agent: use sonnet
  - QA Agent: use haiku (just verification)"

I will spawn each agent with the specified model.
```

### Save Model Preferences to Memory

To avoid repeating this every session:

```
You: "Save these agent model preferences:
  - Coding Agent: opus
  - Testing Agent: sonnet
  - UI Test Agent: sonnet
  - QA Agent: haiku"

I will save to memory so next session uses same models.
```

Then next session:
```
You: "Start site-selector-ui task"

I automatically use saved preferences (opus, sonnet, sonnet, haiku)
```

### Why Different Models?

- **Coding Agent**: Use `opus` for complex architectural decisions
- **Testing Agent**: Use `sonnet` for comprehensive test writing
- **UI Test Agent**: Use `sonnet` for understanding user workflows
- **QA Agent**: Use `haiku` for quick verification (lightweight)

This optimizes cost and speed based on task complexity.

---

## Frequently Asked Questions

### Q: What if I disconnect/run out of tokens?
**A**: All progress saved to status.md. Session resumption reads status and continues.

### Q: Can I run multiple tasks in parallel?
**A**: Yes! Say "Start task-1" then "Start task-2". Both run with separate status tracking.

### Q: What if Testing Agent finds coverage < 90%?
**A**: Refactoring tasks sent to Coding Agent automatically. Loop continues until ≥90%.

### Q: What if QA finds issues?
**A**: Issues escalated to Coding Agent for fix. QA re-tests after fix.

### Q: Can I change models mid-task?
**A**: Yes. Tell me anytime: "Use opus for Testing Agent going forward"

### Q: How do I know if I'm waiting on user input?
**A**: Check status.md for "Questions Waiting for User Response" section.

### Q: Can I abort a task?
**A**: Yes. "Cancel site-selector-ui task". Work can be resumed later from status checkpoint.

---

## Next Steps

1. **Read the user guide**: `memory/HOW_TO_USE_THIS_SYSTEM.md`
2. **Choose agent models** (or use defaults)
3. **Start first task**: "Start site-selector-ui task"
4. **Monitor progress**: Ask for status updates or check status.md

---

## Quick Links

- **User Guide**: `memory/HOW_TO_USE_THIS_SYSTEM.md`
- **Workflow Overview**: `memory/multi_agent_workflow.md`
- **Task List**: `memory/tasks.md`
- **Memory Index**: `memory/MEMORY.md`
- **Project Conventions**: `AGENTS.md`
- **Orchestrator Role**: `memory/orchestrator_role.md`

---

**System created**: 2026-04-25  
**Last updated**: 2026-04-25  
**All agent instructions**: Saved to memory, persistent across sessions
