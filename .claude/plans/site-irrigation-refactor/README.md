# Task: site-irrigation-refactor

**UUID**: `a1f2b3c4-d5e6-4f5a-8c7d-1e2f3a4b5c6d`

**Purpose**: Umbrella task that coordinates the three implementation tasks to ensure a cohesive refactoring of site and irrigation data management.

**Current State**: Site management and irrigation details are disconnected.

**Desired State**: Sites and irrigation equipment are managed as integrated, persistent entities with pre-fill flows in inspections.

## Instruction Files

- **[coding.md](./coding.md)** — Integration checklist and coordination notes
- **[unit-tests.md](./unit-tests.md)** — End-to-end integration tests across all three tasks
- **[ui-tests.md](./ui-tests.md)** — Full-flow manual testing (inspection + sites)

## Related Tasks

- Coordinates: `site-selector-ui`, `link-irrigation-fields`, `sites-menu-irrigation`
- Each subtask must be completed before this task is signed off

## Scope

This is a **coordination task**, not a standalone implementation task. There is no discrete code owned by this task. Instead:
- Track completion of all three subtasks
- Verify integration across subtasks
- Ensure no regressions
- Document the feature in relevant docs
