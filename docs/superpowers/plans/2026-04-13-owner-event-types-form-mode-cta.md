# Owner Event Types Form Mode CTA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove duplicate create calls to action on the owner event types screen and make the primary form button reflect whether the owner is adding a new type or saving changes to an existing one.

**Architecture:** Keep the shared form panel in `OwnerEventTypesPage` as the single source of truth for create and edit mode, and drive UI differences from the existing `mode` state instead of introducing a new flow. Update the app-level integration tests first, then make the minimal component changes needed to align CTA visibility, form heading copy, and primary button labels with the approved spec.

**Tech Stack:** React, TypeScript, Vitest, Testing Library

---

## File Map

- Modify: `apps/frontend/src/components/OwnerEventTypesPage.tsx`
  Purpose: Hide duplicate create CTAs in create mode, update the form heading for edit mode, remove the empty-state create button, and switch the primary action label between `Добавить` and `Сохранить`.
- Modify: `apps/frontend/src/App.test.tsx`
  Purpose: Update integration coverage for the owner event types workspace so the approved mode-specific CTA rules are enforced.
- Reference: `docs/superpowers/specs/2026-04-13-owner-event-types-form-mode-cta-design.md`
  Purpose: Approved UI behavior for create and edit mode.

## Task 1: Lock The New UI Contract In Tests

**Files:**
- Modify: `apps/frontend/src/App.test.tsx`
- Reference: `apps/frontend/src/components/OwnerEventTypesPage.tsx`

- [ ] **Step 1: Update the create-mode integration test to assert the new button text and hidden duplicate CTA**

Add or update the existing create-mode test so it asserts all approved rules in one place:

```tsx
it('opens create mode from "+ Создать тип события" with a single create path', async () => {
  const user = userEvent.setup();

  render(<App scenario="public" />);

  await user.click(
    within(screen.getByRole("navigation", { name: "Разделы приложения" })).getByRole("button", {
      name: "Типы событий",
    }),
  );
  await user.click(screen.getByRole("button", { name: "+ Создать тип события" }));

  expect(screen.getByRole("heading", { name: "Новый тип события" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "+ Создать тип события" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Добавить" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Сохранить" })).not.toBeInTheDocument();
  expect(screen.getByLabelText("Название")).toHaveValue("");
  expect(screen.getByLabelText("Описание")).toHaveValue("");
  expect(screen.getByLabelText("Длительность")).toHaveValue(null);
  expect(screen.queryByRole("button", { name: "Удалить" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Архивировать" })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Add an empty-state test that rejects the removed duplicate CTA**

Create a focused test that proves the list empty state no longer renders `Создать первый тип` while the form already exposes create mode:

```tsx
it("shows a passive empty state when no event types exist", async () => {
  render(<App scenario="owner-empty-event-types" />);

  expect(screen.getByText("Типов событий пока нет.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Создать первый тип" })).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Новый тип события" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Добавить" })).toBeInTheDocument();
});
```

If the exact scenario name differs, use the existing empty-owner-event-types scenario already defined in `App.tsx` or its current equivalent.

- [ ] **Step 3: Update the create-through-backend test to use the new primary action label and post-create state**

Change the existing create test so it clicks `Добавить` instead of `Сохранить`, then verifies the screen returns to edit mode for the new item:

```tsx
await user.click(screen.getByRole("button", { name: "Добавить" }));

expect(await screen.findByText("Тип события создан."));
expect(screen.getByRole("button", { name: "Сохранить" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "+ Создать тип события" })).toBeInTheDocument();
```

- [ ] **Step 4: Run the focused frontend tests and confirm they fail for the expected reasons**

Run:

```bash
cd /home/evgeny/projects/callplanner/apps/frontend && npx vitest run src/App.test.tsx -t 'opens create mode from "+ Создать тип события" with a single create path|shows a passive empty state when no event types exist|creates an owner event type through the backend and refreshes public choices'
```

Expected:
- FAIL because the current UI still renders `Создать первый тип`
- FAIL because the current primary button still reads `Сохранить` in create mode
- FAIL because the current left-panel create CTA is still visible in create mode

- [ ] **Step 5: Commit the test-only changes**

```bash
git add /home/evgeny/projects/callplanner/apps/frontend/src/App.test.tsx
git commit -m "test: cover owner event type form modes"
```

## Task 2: Update Owner Event Types Page UI States

**Files:**
- Modify: `apps/frontend/src/components/OwnerEventTypesPage.tsx`
- Test: `apps/frontend/src/App.test.tsx`

- [ ] **Step 1: Derive simple mode flags near the selected event type calculation**

Add explicit booleans that make render conditions readable and avoid scattering string comparisons through the JSX:

```tsx
const isCreateMode = mode === "create";
const isEditMode = mode === "edit";
const selectedEventType =
  isEditMode ? eventTypes.find((eventType) => eventType.id === selectedEventTypeId) ?? null : null;
```

- [ ] **Step 2: Hide the left-panel create CTA while create mode is active**

Replace the always-visible header button with a mode-aware render:

```tsx
<div className="owner-list-panel__header">
  <div>
    <p className="bookings-card__eyebrow">Типы событий</p>
  </div>
  {isEditMode ? (
    <button type="button" className="secondary-button" onClick={openCreateMode} disabled={submitting}>
      + Создать тип события
    </button>
  ) : null}
</div>
```

This preserves the single entry point rule: the create CTA exists only when the form is currently editing.

- [ ] **Step 3: Remove the duplicate empty-state create button**

Shrink the empty state to informational copy only:

```tsx
<div className="owner-empty-state">
  <p className="owner-empty-state__title">Типов событий пока нет.</p>
  <p className="empty-copy">
    Создайте первый тип события, чтобы подготовить owner workspace к будущей публикации слотов.
  </p>
</div>
```

Do not render `Создать первый тип` here, because the right panel already exposes the create form.

- [ ] **Step 4: Make the form header mode-aware**

Update the right-panel heading so it reflects the current form state:

```tsx
<section
  className="owner-card owner-form-panel"
  aria-label={isCreateMode ? "Новый тип события" : "Редактирование типа события"}
>
  <div className="owner-form-panel__header">
    <div>
      <p className="bookings-card__eyebrow">
        {isCreateMode ? "Новый тип события" : "Редактирование типа события"}
      </p>
    </div>
    {selectedEventType ? (
      <div className="owner-status-row owner-status-row--compact">
        {getStatusBadges(selectedEventType).map((status) => (
          <span
            key={status}
            className={`owner-status-pill${status === "Архив" ? " owner-status-pill--archived" : ""}`}
          >
            {status}
          </span>
        ))}
      </div>
    ) : null}
  </div>
```

Use the existing status-badge block unchanged for edit mode only.

- [ ] **Step 5: Make the primary button label mode-aware**

Replace the static label with create/edit wording:

```tsx
<button type="button" className="primary-button" onClick={() => void handleSave()} disabled={submitting}>
  {submitting ? "Сохраняем..." : isCreateMode ? "Добавить" : "Сохранить"}
</button>
```

This keeps the in-flight label stable while clarifying idle-state intent.

- [ ] **Step 6: Run the focused tests and confirm they pass**

Run:

```bash
cd /home/evgeny/projects/callplanner/apps/frontend && npx vitest run src/App.test.tsx -t 'opens create mode from "+ Создать тип события" with a single create path|shows a passive empty state when no event types exist|creates an owner event type through the backend and refreshes public choices|updates an owner event type through the backend and refreshes public choices'
```

Expected:
- PASS for the new create-mode assertions
- PASS for the empty-state assertions
- PASS for the existing edit-mode save flow

- [ ] **Step 7: Commit the UI change**

```bash
git add /home/evgeny/projects/callplanner/apps/frontend/src/components/OwnerEventTypesPage.tsx /home/evgeny/projects/callplanner/apps/frontend/src/App.test.tsx
git commit -m "feat: clarify owner event type form modes"
```

## Task 3: Run Regression Checks For Owner Event Types

**Files:**
- Test: `apps/frontend/src/App.test.tsx`

- [ ] **Step 1: Run the broader owner event types regression slice**

Run:

```bash
cd /home/evgeny/projects/callplanner/apps/frontend && npx vitest run src/App.test.tsx -t 'owner event type|Типы событий|creates an owner event type through the backend and refreshes public choices|updates an owner event type through the backend and refreshes public choices|deletes an unused owner event type through the backend|archives a used owner event type through the backend'
```

Expected:
- PASS for create, update, delete, and archive scenarios
- PASS for navigation into the owner event types workspace

- [ ] **Step 2: Run the full frontend test suite if the regression slice passes cleanly**

Run:

```bash
cd /home/evgeny/projects/callplanner/apps/frontend && npm run test -- --run
```

Expected:
- PASS for the existing frontend suite

If unrelated failures already exist, document them and do not expand scope to fix them unless they were introduced by this change.

- [ ] **Step 3: Commit the validation checkpoint**

```bash
git add /home/evgeny/projects/callplanner/apps/frontend/src/components/OwnerEventTypesPage.tsx /home/evgeny/projects/callplanner/apps/frontend/src/App.test.tsx
git commit -m "test: verify owner event type regressions"
```
