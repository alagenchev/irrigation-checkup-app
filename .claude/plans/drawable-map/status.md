# Status: drawable-map

**UUID**: `b7e4f2a1-c3d5-4e6b-9f8a-2c1d3e4f5a6b`

## Phase Tracking

### Coding Phase
- **Status**: pending
- **Owner**: (unassigned)
- **Started**: —
- **Branch**: `feature/drawable-map`
- **Notes**: Schema + API routes + Mapbox component + SitesPageClient integration

### Code Review Phase
- **Status**: pending (waiting for coding complete)
- **Owner**: (unassigned — Code Review Agent, fresh session)
- **Started**: —
- **Review Cycle**: — of 3
- **CODE_REVIEW.md**: (created during phase)

### Unit Tests Phase
- **Status**: pending (waiting for code review approved)
- **Owner**: (unassigned)
- **Started**: —
- **Branch**: `feature/drawable-map` (same branch)

### UI Tests Phase
- **Status**: pending (waiting for unit tests complete)
- **Owner**: (unassigned)
- **Started**: —
- **Notes**: Requires `NEXT_PUBLIC_MAPBOX_TOKEN` in `.env.local`

## Dependencies

- **Blocks**: (none)
- **Depends on**: (none — standalone feature)

## Communication

**Coding Phase**:
1. Read `coding.md` for full implementation steps
2. Create branch `feature/drawable-map`
3. Install deps, add schema, generate+apply migration, create API routes, create components, update SitesTable + SitesPageClient
4. Run `npm run build && npm test && npm run test:db` — all must pass
5. Commit with task name + UUID in message
6. Update **Owner** and **Status** here
7. Mark `completed` when done

**Code Review Phase**:
1. Fresh session — read `coding.md` for intent, diff for implementation
2. Review: multi-tenancy (companyId on every query), SSR-disabled component, no GeoJSON transformation, no secrets in client code
3. Create `CODE_REVIEW.md` with BLOCKER / MAJOR / MINOR / NITS
4. Block only on BLOCKER or MAJOR issues
5. Mark `completed` when approved

**Unit Tests Phase**:
1. Read `unit-tests.md` for all test cases
2. Add `__tests__/site-drawing.integration.test.ts` and `__tests__/site-drawing.test.ts`
3. Run `npm test && npm run test:db` — all must pass
4. Mark `completed` when coverage targets met

**UI Tests Phase**:
1. Confirm `NEXT_PUBLIC_MAPBOX_TOKEN` is set in `.env.local`
2. Read `ui-tests.md` for all test cases
3. Add `e2e/drawable-map.spec.ts`
4. Run `npx playwright test e2e/drawable-map.spec.ts`
5. Complete manual persistence smoke test and document result
6. Mark `completed` when all automated + manual checks pass

## Blockers / Notes

(none yet)

**Last Updated**: 2026-04-26 (task created)
