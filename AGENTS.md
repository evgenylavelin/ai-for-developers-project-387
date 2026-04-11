# Repository Guidelines

## Project Structure & Module Organization
This repository is currently documentation-first. The tracked files are `README.md` and CI workflow files under `.github/workflows/`.

The intended project layout is defined in `README.md`:
- `spec/` — TypeSpec API contract and generated API description.
- `apps/frontend/` — client application.
- `apps/backend/` — server application.

Keep new code aligned with that structure. Put contract changes in `spec/` first, then update frontend and backend code against the revised contract.

## Build, Test, and Development Commands
There is no local build pipeline checked in yet. Use the repository’s current commands and keep additions documented in `README.md`.

Examples:
- `git status` — verify the working tree before committing.
- `git log --oneline` — review recent commit style.
- `sed -n '1,200p' README.md` — inspect the current architecture notes.

CI runs through GitHub Actions on every push via `.github/workflows/hexlet-check.yml`. Do not rename, delete, or edit that workflow unless the project requirements explicitly change.

## Coding Style & Naming Conventions
Follow a design-first workflow: update the API contract before implementation. Use clear, lowercase directory names such as `spec`, `frontend`, and `backend`.

For Markdown:
- use `#`-style headings
- keep sections short and task-focused
- prefer fenced code blocks for examples

For future source files, match the formatter and linter chosen for that stack and document the commands near the tool config.

## Testing Guidelines
Automated checks are currently provided by Hexlet CI, triggered on each push. There are no local test scripts committed yet.

When tests are added:
- keep test files near the relevant app or under a dedicated `tests/` directory
- name tests after the behavior they verify, for example `booking-slots.test.*`
- document the exact local test command in `README.md`

## Commit & Pull Request Guidelines
Recent history uses short, imperative commit messages such as `Add README.md` and `Update README.md with detailed project description and API structure`.

For contributions:
- write concise imperative commit subjects
- keep each commit scoped to one change
- include a PR summary describing what changed and why
- link the related issue or task when available
- include screenshots only for UI changes

## Agent-Specific Notes
Preserve user changes in a dirty worktree. Avoid destructive Git commands. If you add tooling, tests, or app directories, update this guide and `README.md` in the same change.
