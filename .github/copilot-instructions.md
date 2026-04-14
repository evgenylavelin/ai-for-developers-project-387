# Project Guidelines

## Architecture

- Follow the Design First approach described in [README.md](../README.md): define and update the API contract before implementing frontend or backend behavior.
- Treat the API contract as the source of truth that keeps the planned `spec`, `apps/frontend`, and `apps/backend` areas aligned.
- Preserve the current product constraints from [README.md](../README.md): no user registration, a fixed owner role, anonymous guests, a 14-day booking window, and globally unique booked slots.

## Repository State

- This repository is currently a scaffold. The planned `spec`, `apps/frontend`, and `apps/backend` directories are documented in [README.md](../README.md) but may not exist yet.
- Before proposing edits or commands, verify that target files, directories, and toolchain files actually exist in the workspace.
- Prefer adding the minimum structure needed for the current task instead of assuming the full application skeleton is already present.

## Build And Test

- There are no documented local build, run, or test commands yet. If a task depends on local tooling, inspect the workspace first and add the missing setup as part of the change.
- Automated validation is handled by the generated GitHub Actions workflow in [hexlet-check.yml](workflows/hexlet-check.yml). Do not edit or remove that file.
- For Hexlet-specific testing context, refer to [workflows README](workflows/README.md) instead of duplicating it here.

## Conventions

- Keep requirement and business-rule details anchored to [README.md](../README.md); update that file when project-level behavior changes.
- When implementation starts, keep frontend and backend changes aligned with the contract-first architecture rather than coupling one side to undocumented behavior.
- Avoid inventing undocumented commands, services, or directories. If the repo does not define them yet, create them explicitly or call out the missing setup.
- Treat [design.md](../design.md) as the frontend color source of truth. Do not introduce palette deviations, alternate accent families, or hardcoded page colors outside that document unless a later design document updates the palette first.