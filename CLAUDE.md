# Agent Instructions

See **[AGENTS.md](./AGENTS.md)** for all coding, testing, architecture, and project conventions. That file is the single source of truth for all agents working in this repository.

---

## Task Tracking System

Implementation work uses a persistent task tracking system with UUIDs, git integration, and long-term memory.

### Task Structure

Each task has:
- **UUID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` — globally unique, immutable
- **Name**: `kebab-case-name` — unique within currently active tasks (pending or in_progress)
- **Status**: `pending` | `in_progress` | `completed`
- **Plan file**: `.claude/plans/{name}.md` (moved to `.claude/plans/completed/{name}.md` when done)

### Workflow

1. **Create**: Generate UUID, create plan in `.claude/plans/{name}.md`, record in memory task list
2. **Start**: Mark task `pending` → `in_progress`, begin implementation
3. **Commit**: Reference task name and UUID in commit message:
   ```
   site-selector-ui (f47ac10b-58cc-4372-a567-0e02b2c3d479): Brief description
   
   - Bullet point changes
   
   Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
   ```
4. **Complete**: Mark `in_progress` → `completed`, move plan to `.claude/plans/completed/`, update memory
5. **Reference**: Search git by task name: `git log --grep="site-selector-ui"`, lookup UUID for global uniqueness

### Why This System

- **UUID**: Global uniqueness even if task is revived or re-worked
- **Kebab-case name**: Human-readable, prevents conflicts, searchable in git logs
- **Git commits are immutable**: Task-to-code link is permanent
- **Plan files document intent**: Comparison between plan and implementation
- **Memory persists**: Future conversations understand what's been done
- **Multiple reference points**: Find work by task name, UUID, or git commit

### Master Task List

Active and completed tasks tracked in persistent memory:
- **Location**: `.claude/projects/-Users-alagenchev-field-tech-irrigation-checkup-app/memory/tasks.md`
- **Updated**: When tasks are created, started, or completed
