# Repository Guidelines

## Project Status
This repository is currently in a documentation-first stage.

The system behavior is defined by the API contract in `spec/`.  
`README.md` provides a human-readable description of the system but is not the source of truth.

The intended layout is:

- `spec/` — TypeSpec API contract and generated API description
- `apps/frontend/` — client application
- `apps/backend/` — server application

Do not assume those directories already exist. Create only the minimum required structure for the current task.

---

## Core Development Rule (Design First)

The API contract is the **single source of truth**.

If system behavior changes:
1. update the contract in `spec/`
2. then update backend and frontend implementations

Do not introduce behavior in code that is not described in the contract.

Recommended workflow:
1. clarify behavior
2. update contract (`spec/`)
3. implement backend/frontend
4. add/update tests
5. update documentation if needed

---

## Product Constraints

Preserve the following rules from `README.md` unless explicitly changed:

- no registration or authentication
- one fixed owner profile
- anonymous guest booking
- booking window is limited to 14 days
- the same time slot cannot be booked twice (even across event types)

Do not invent additional roles or flows.

---

## Repository Structure

Keep new files aligned with the documented structure:

- contract → `spec/`
- frontend → `apps/frontend/`
- backend → `apps/backend/`

If a task requires new directories, introduce them explicitly and keep them consistent with `README.md`.

---

## Build, Test, and Development

There is no fully defined local toolchain yet.

Before suggesting commands, verify that required files exist.

Frontend commands are available once `apps/frontend/` exists:

```bash
npm run frontend:dev
npm run frontend:build
npm run frontend:test -- --run
```

Backend commands are available once `apps/backend/` exists:

```bash
npm run backend:dev
npm run backend:build
npm run backend:test -- --run
```

Root-level browser e2e commands are available once Playwright is configured:

```bash
npm run e2e:install
npm run e2e:test
```

Useful basic commands:

```bash
git status
git log --oneline
sed -n '1,200p' README.md
```

If you introduce new tooling:

* keep it minimal
* document it in `README.md`

---

## Testing

Validation is performed in GitHub Actions on each push and pull request:

* workflow: `.github/workflows/hexlet-check.yml`
* workflow: `.github/workflows/e2e.yml`

Local test commands are available once the corresponding app dependencies are installed:

* `npm run backend:test -- --run`
* `npm run frontend:test -- --run`
* `npm run e2e:test`

When tests are added:

* place them near the relevant app or in `tests/`
* name them after behavior (e.g., `booking-slots.test.*`)
* document how to run them locally

Browser integration tests live in `tests/e2e/` and should prepare backend state through public HTTP APIs rather than in-process repository mutations.

When frontend tests are present:

* place component and interaction tests in `apps/frontend/src/`
* keep pure state logic tests near `apps/frontend/src/lib/`
* document any new frontend tooling in `README.md`

When backend tests are present:

* place API integration tests near `apps/backend/src/`
* keep pure time and validation helpers under `apps/backend/src/lib/`
* document any new backend tooling in `README.md`

---

## Commit & Pull Request Guidelines

- use concise, imperative commit messages, for example `Add booking API endpoint`
- keep commits focused on a single change
- include in each PR: what changed, why it changed, and the related issue or task if available
- include screenshots only for UI changes

---

## Change Safety

* preserve user changes in a dirty worktree
* avoid destructive Git commands
* do not remove or rewrite files unless required

When adding structure or tooling:

* update both this file and `README.md` accordingly

---

## Frontend Color System

The frontend color palette is defined by `design.md`.

Treat `design.md` as the source of truth for page colors and interactive color usage.

When working on frontend UI:

* do not introduce accent hues or tinted surfaces that are not derived from `design.md`
* do not add warm, pink, beige, purple, blue, or neutral-brand alternatives unless a later design document explicitly replaces or extends the palette
* prefer semantic CSS variables mapped from `design.md` over hardcoded color literals in components or page styles
* if the palette needs to change, update `design.md` first and then align the frontend implementation
