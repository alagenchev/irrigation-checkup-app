# Task: auto-select-single-inspector

**UUID**: `d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a`

**Purpose**: When a company has exactly one inspector registered, the "Inspected By" dropdown on the inspection form should auto-select that inspector and render as static text rather than a dropdown. There is nothing to choose from — making the user interact with a 1-item dropdown is friction.

**Current State**: The inspector dropdown always initialises with `inspectorId: ''` and always renders a `<select>` regardless of how many inspectors exist.

**Desired State**:
- **0 inspectors**: show the `<select>` with the "— Select Inspector —" placeholder (current behaviour — no change)
- **1 inspector**: auto-select on mount; render the inspector name as static readonly text (same style as the License # display below it) — no dropdown shown
- **2+ inspectors**: show the `<select>` as today (no change)

## Instruction Files

- **[coding.md](./coding.md)** — Two-line fix in `useState` + conditional JSX
- **[unit-tests.md](./unit-tests.md)** — Unit tests for all three inspector-count cases
- **[ui-tests.md](./ui-tests.md)** — Playwright tests for the rendered output

## Related Tasks

- Overlaps with `remove-performed-by` (`e3f4a5b6-...`) which also mentioned this auto-select. That task is still pending; this task handles only the single-inspector UX. When `remove-performed-by` is eventually implemented, remove the auto-select bullet from its scope to avoid duplication.
- Depends on: (none)
- Blocks: (none)
