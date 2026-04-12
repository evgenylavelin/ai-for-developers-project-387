# Owner Event Types UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a separate owner-facing page in the frontend for mock CRUD management of event types, with responsive list-plus-form layout and archive-only behavior for used types.

**Architecture:** Extend the current React frontend with a small owner UI state model that lives alongside the existing public booking flow. Keep the work UI-only: local mock data, local state transitions, explicit visual statuses, and no backend or TypeSpec changes in this iteration.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library

---

## File Structure

Planned files and responsibilities:

- Modify: `apps/frontend/src/types.ts` to add owner-facing event type metadata and app-view types
- Modify: `apps/frontend/src/data/mockGuestFlow.ts` to provide mock owner event types with active, archived, used, and unused states
- Create: `apps/frontend/src/lib/ownerEventTypes.ts` for pure UI-state helpers
- Create: `apps/frontend/src/lib/ownerEventTypes.test.ts` for pure owner-state tests
- Create: `apps/frontend/src/components/AppNav.tsx` for top-level switch between public and owner views
- Create: `apps/frontend/src/components/OwnerEventTypesPage.tsx` for the owner screen composition
- Create: `apps/frontend/src/components/OwnerEventTypeList.tsx` for the left-side list / top stacked section
- Create: `apps/frontend/src/components/OwnerEventTypeForm.tsx` for the right-side form / lower stacked section
- Modify: `apps/frontend/src/App.tsx` to add app-level navigation and owner-page state
- Modify: `apps/frontend/src/App.test.tsx` to add UI integration tests for the new owner page
- Modify: `apps/frontend/src/styles.css` to add app shell navigation and owner-page responsive styles
- Modify: `README.md` to document the owner UI page as frontend-only mock functionality
- Modify: `AGENTS.md` to note the owner event-types UI work now exists in `apps/frontend/`

### Task 1: Add Owner UI Domain Types And Mock Data

**Files:**
- Modify: `apps/frontend/src/types.ts`
- Modify: `apps/frontend/src/data/mockGuestFlow.ts`
- Test: `apps/frontend/src/lib/ownerEventTypes.test.ts`

- [ ] **Step 1: Write the failing pure-state tests**

Create `apps/frontend/src/lib/ownerEventTypes.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { ownerEventTypes } from "../data/mockGuestFlow";
import {
  buildOwnerEventTypeFormState,
  canDeleteEventType,
  getOwnerEventTypeStatusLabels,
} from "./ownerEventTypes";

describe("ownerEventTypes helpers", () => {
  it("marks an unused active event type as deletable", () => {
    const unusedType = ownerEventTypes.find((item) => item.id === "deep-dive");

    expect(unusedType).toBeDefined();
    expect(canDeleteEventType(unusedType!)).toBe(true);
  });

  it("prevents deletion for used event types", () => {
    const usedType = ownerEventTypes.find((item) => item.id === "standard");

    expect(usedType).toBeDefined();
    expect(canDeleteEventType(usedType!)).toBe(false);
  });

  it("builds create mode with empty fields", () => {
    expect(buildOwnerEventTypeFormState("create")).toEqual({
      mode: "create",
      title: "",
      note: "",
      durationMinutes: "",
    });
  });

  it("builds edit mode from an existing event type", () => {
    const archivedType = ownerEventTypes.find((item) => item.id === "intro");

    expect(archivedType).toBeDefined();
    expect(buildOwnerEventTypeFormState("edit", archivedType!)).toEqual({
      mode: "edit",
      title: "15 минут",
      note: "Короткая вводная встреча для первичной диагностики запроса.",
      durationMinutes: "15",
    });
  });

  it("returns active, archived, and used status labels in UI order", () => {
    const archivedUsedType = ownerEventTypes.find((item) => item.id === "intro");

    expect(archivedUsedType).toBeDefined();
    expect(getOwnerEventTypeStatusLabels(archivedUsedType!)).toEqual([
      "Архив",
      "Использовался в бронированиях",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run frontend:test -- --run apps/frontend/src/lib/ownerEventTypes.test.ts
```

Expected:

```text
FAIL  apps/frontend/src/lib/ownerEventTypes.test.ts
Error: Failed to resolve import "./ownerEventTypes"
```

- [ ] **Step 3: Extend the frontend types for owner UI**

Update `apps/frontend/src/types.ts`:

```ts
export type EventType = {
  id: string;
  title: string;
  durationMinutes: number;
  note?: string;
  isArchived?: boolean;
  wasUsedInBookings?: boolean;
};

export type OwnerView = "public" | "owner";

export type OwnerFormMode = "create" | "edit";

export type OwnerEventTypeFormState = {
  mode: OwnerFormMode;
  title: string;
  note: string;
  durationMinutes: string;
};
```

- [ ] **Step 4: Add mock owner event types with explicit UI states**

Update `apps/frontend/src/data/mockGuestFlow.ts`:

```ts
export const ownerEventTypes: EventType[] = [
  {
    id: "intro",
    title: "15 минут",
    durationMinutes: 15,
    note: "Короткая вводная встреча для первичной диагностики запроса.",
    isArchived: true,
    wasUsedInBookings: true,
  },
  {
    id: "standard",
    title: "30 минут",
    durationMinutes: 30,
    note: "Основной формат встречи для большинства входящих запросов.",
    wasUsedInBookings: true,
  },
  {
    id: "deep-dive",
    title: "60 минут",
    durationMinutes: 60,
    note: "Длинная сессия для подробного разбора кейса.",
    wasUsedInBookings: false,
  },
];
```

- [ ] **Step 5: Add the pure owner UI helper module**

Create `apps/frontend/src/lib/ownerEventTypes.ts`:

```ts
import type { EventType, OwnerEventTypeFormState, OwnerFormMode } from "../types";

export function canDeleteEventType(eventType: EventType): boolean {
  return !eventType.wasUsedInBookings;
}

export function buildOwnerEventTypeFormState(
  mode: OwnerFormMode,
  eventType?: EventType,
): OwnerEventTypeFormState {
  if (mode === "create") {
    return {
      mode,
      title: "",
      note: "",
      durationMinutes: "",
    };
  }

  if (!eventType) {
    throw new Error("Edit mode requires an event type");
  }

  return {
    mode,
    title: eventType.title,
    note: eventType.note ?? "",
    durationMinutes: String(eventType.durationMinutes),
  };
}

export function getOwnerEventTypeStatusLabels(eventType: EventType): string[] {
  const labels: string[] = [];

  labels.push(eventType.isArchived ? "Архив" : "Активен");

  if (eventType.wasUsedInBookings) {
    labels.push("Использовался в бронированиях");
  }

  return labels;
}
```

- [ ] **Step 6: Run the pure-state test file**

Run:

```bash
npm run frontend:test -- --run apps/frontend/src/lib/ownerEventTypes.test.ts
```

Expected:

```text
 PASS  apps/frontend/src/lib/ownerEventTypes.test.ts
  ownerEventTypes helpers
```

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/types.ts apps/frontend/src/data/mockGuestFlow.ts apps/frontend/src/lib/ownerEventTypes.ts apps/frontend/src/lib/ownerEventTypes.test.ts
git commit -m "Add owner event type UI state helpers"
```

### Task 2: Build The Owner Event Types Screen Components

**Files:**
- Create: `apps/frontend/src/components/AppNav.tsx`
- Create: `apps/frontend/src/components/OwnerEventTypeList.tsx`
- Create: `apps/frontend/src/components/OwnerEventTypeForm.tsx`
- Create: `apps/frontend/src/components/OwnerEventTypesPage.tsx`
- Modify: `apps/frontend/src/styles.css`
- Test: `apps/frontend/src/App.test.tsx`

- [ ] **Step 1: Write the failing owner page integration tests**

Append to `apps/frontend/src/App.test.tsx`:

```tsx
  it("opens the owner event types page from the app navigation", async () => {
    const user = userEvent.setup();

    render(<App scenario="public" />);

    await user.click(screen.getByRole("button", { name: "Управление типами" }));

    expect(
      screen.getByRole("heading", { name: "Управление типами событий" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Создать тип события" })).toBeInTheDocument();
  });

  it("shows archived and used statuses for owner event types", async () => {
    const user = userEvent.setup();

    render(<App scenario="public" />);

    await user.click(screen.getByRole("button", { name: "Управление типами" }));

    expect(screen.getByText("Архив")).toBeInTheDocument();
    expect(screen.getAllByText("Использовался в бронированиях").length).toBeGreaterThan(0);
  });

  it("switches the owner form into create mode", async () => {
    const user = userEvent.setup();

    render(<App scenario="public" />);

    await user.click(screen.getByRole("button", { name: "Управление типами" }));
    await user.click(screen.getByRole("button", { name: "+ Создать тип события" }));

    expect(screen.getByRole("heading", { name: "Новый тип события" })).toBeInTheDocument();
    expect(screen.getByLabelText("Название")).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Удалить" })).not.toBeInTheDocument();
  });

  it("shows archive action instead of delete for used types", async () => {
    const user = userEvent.setup();

    render(<App scenario="public" />);

    await user.click(screen.getByRole("button", { name: "Управление типами" }));
    await user.click(screen.getByRole("button", { name: "30 минут" }));

    expect(screen.getByText("Использовался в бронированиях")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Архивировать" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Удалить" })).not.toBeInTheDocument();
  });

  it("shows delete action for unused types", async () => {
    const user = userEvent.setup();

    render(<App scenario="public" />);

    await user.click(screen.getByRole("button", { name: "Управление типами" }));
    await user.click(screen.getByRole("button", { name: "60 минут" }));

    expect(screen.getByRole("button", { name: "Удалить" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Архивировать" })).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the app test file to verify the new tests fail**

Run:

```bash
npm run frontend:test -- --run apps/frontend/src/App.test.tsx
```

Expected:

```text
FAIL  apps/frontend/src/App.test.tsx
TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Управление типами"
```

- [ ] **Step 3: Add the app-level navigation component**

Create `apps/frontend/src/components/AppNav.tsx`:

```tsx
import type { OwnerView } from "../types";

type AppNavProps = {
  activeView: OwnerView;
  onChangeView: (view: OwnerView) => void;
};

export function AppNav({ activeView, onChangeView }: AppNavProps) {
  return (
    <nav className="app-nav" aria-label="Основная навигация">
      <div className="app-nav__brand">
        <span className="app-nav__eyebrow">Call Planner</span>
        <strong>Frontend Demo</strong>
      </div>
      <div className="app-nav__actions">
        <button
          type="button"
          className={`filter-chip${activeView === "public" ? " filter-chip--active" : ""}`}
          onClick={() => onChangeView("public")}
        >
          Публичный календарь
        </button>
        <button
          type="button"
          className={`filter-chip${activeView === "owner" ? " filter-chip--active" : ""}`}
          onClick={() => onChangeView("owner")}
        >
          Управление типами
        </button>
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Add the owner event types list component**

Create `apps/frontend/src/components/OwnerEventTypeList.tsx`:

```tsx
import { getOwnerEventTypeStatusLabels } from "../lib/ownerEventTypes";
import type { EventType } from "../types";

type OwnerEventTypeListProps = {
  eventTypes: EventType[];
  selectedEventTypeId: string | null;
  onCreate: () => void;
  onSelect: (eventTypeId: string) => void;
};

export function OwnerEventTypeList({
  eventTypes,
  selectedEventTypeId,
  onCreate,
  onSelect,
}: OwnerEventTypeListProps) {
  if (eventTypes.length === 0) {
    return (
      <section className="owner-card owner-card--list">
        <div className="owner-card__header">
          <div>
            <p className="bookings-card__eyebrow">Owner</p>
            <h1>Управление типами событий</h1>
          </div>
          <button type="button" className="primary-button" onClick={onCreate}>
            + Создать тип события
          </button>
        </div>
        <div className="day-panel__empty">
          <p>Типы событий еще не настроены. Создайте первый тип, чтобы заполнить owner page.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="owner-card owner-card--list">
      <div className="owner-card__header">
        <div>
          <p className="bookings-card__eyebrow">Owner</p>
          <h1>Управление типами событий</h1>
        </div>
        <button type="button" className="primary-button" onClick={onCreate}>
          + Создать тип события
        </button>
      </div>
      <div className="owner-event-type-list" role="list" aria-label="Типы событий владельца">
        {eventTypes.map((eventType) => {
          const isSelected = eventType.id === selectedEventTypeId;

          return (
            <button
              key={eventType.id}
              type="button"
              className={`owner-event-type-item${isSelected ? " owner-event-type-item--selected" : ""}`}
              onClick={() => onSelect(eventType.id)}
            >
              <span className="owner-event-type-item__title">{eventType.title}</span>
              <span className="owner-event-type-item__duration">
                {eventType.durationMinutes} минут
              </span>
              <span className="owner-status-list">
                {getOwnerEventTypeStatusLabels(eventType).map((label) => (
                  <span key={label} className="owner-status-badge">
                    {label}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Add the owner event type form component**

Create `apps/frontend/src/components/OwnerEventTypeForm.tsx`:

```tsx
import { canDeleteEventType } from "../lib/ownerEventTypes";
import type { EventType, OwnerEventTypeFormState } from "../types";

type OwnerEventTypeFormProps = {
  formState: OwnerEventTypeFormState;
  selectedEventType?: EventType;
  onChange: (nextState: OwnerEventTypeFormState) => void;
};

export function OwnerEventTypeForm({
  formState,
  selectedEventType,
  onChange,
}: OwnerEventTypeFormProps) {
  const isCreateMode = formState.mode === "create";
  const showDelete = selectedEventType ? canDeleteEventType(selectedEventType) : false;
  const showArchive = selectedEventType ? !canDeleteEventType(selectedEventType) : false;

  return (
    <section className="owner-card owner-card--form">
      <div className="owner-card__header">
        <div>
          <p className="bookings-card__eyebrow">{isCreateMode ? "Create" : "Edit"}</p>
          <h2>{isCreateMode ? "Новый тип события" : "Редактирование типа события"}</h2>
        </div>
      </div>

      <label className="owner-field">
        <span>Название</span>
        <input
          value={formState.title}
          onChange={(event) => onChange({ ...formState, title: event.target.value })}
        />
      </label>

      <label className="owner-field">
        <span>Описание</span>
        <textarea
          rows={5}
          value={formState.note}
          onChange={(event) => onChange({ ...formState, note: event.target.value })}
        />
      </label>

      <label className="owner-field">
        <span>Длительность</span>
        <input
          value={formState.durationMinutes}
          onChange={(event) =>
            onChange({ ...formState, durationMinutes: event.target.value.replace(/\D/g, "") })
          }
        />
      </label>

      {showArchive ? (
        <div className="owner-form-note">
          Тип уже использовался в бронированиях. Его можно только архивировать.
        </div>
      ) : null}

      <div className="owner-form-actions">
        <button type="button" className="primary-button">
          Сохранить
        </button>
        {showDelete ? (
          <button type="button" className="secondary-button">
            Удалить
          </button>
        ) : null}
        {showArchive ? (
          <button type="button" className="secondary-button">
            Архивировать
          </button>
        ) : null}
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Compose the owner page**

Create `apps/frontend/src/components/OwnerEventTypesPage.tsx`:

```tsx
import { buildOwnerEventTypeFormState } from "../lib/ownerEventTypes";
import type { EventType, OwnerEventTypeFormState } from "../types";
import { OwnerEventTypeForm } from "./OwnerEventTypeForm";
import { OwnerEventTypeList } from "./OwnerEventTypeList";

type OwnerEventTypesPageProps = {
  eventTypes: EventType[];
  selectedEventTypeId: string | null;
  formState: OwnerEventTypeFormState;
  onCreate: () => void;
  onSelect: (eventTypeId: string) => void;
  onFormChange: (nextState: OwnerEventTypeFormState) => void;
};

export function OwnerEventTypesPage({
  eventTypes,
  selectedEventTypeId,
  formState,
  onCreate,
  onSelect,
  onFormChange,
}: OwnerEventTypesPageProps) {
  const selectedEventType =
    eventTypes.find((eventType) => eventType.id === selectedEventTypeId) ?? undefined;

  return (
    <div className="owner-page">
      <OwnerEventTypeList
        eventTypes={eventTypes}
        selectedEventTypeId={selectedEventTypeId}
        onCreate={onCreate}
        onSelect={onSelect}
      />
      <OwnerEventTypeForm
        formState={selectedEventType ? buildOwnerEventTypeFormState("edit", selectedEventType) : formState}
        selectedEventType={selectedEventType}
        onChange={onFormChange}
      />
    </div>
  );
}
```

- [ ] **Step 7: Add owner page styles**

Append to `apps/frontend/src/styles.css`:

```css
.app-shell--app {
  align-items: start;
}

.app-nav {
  width: min(100%, 1180px);
  margin: 0 auto 20px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.app-nav__brand {
  display: grid;
  gap: 4px;
}

.app-nav__eyebrow {
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(24, 33, 23, 0.56);
}

.app-nav__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.owner-page {
  width: min(100%, 1180px);
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(360px, 1.08fr);
  gap: 20px;
}

.owner-card {
  border: 1px solid rgba(24, 33, 23, 0.08);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 18px 48px rgba(54, 70, 52, 0.08);
  backdrop-filter: blur(16px);
  padding: 24px;
}

.owner-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 18px;
}

.owner-event-type-list {
  display: grid;
  gap: 12px;
}

.owner-event-type-item {
  display: grid;
  gap: 8px;
  text-align: left;
  padding: 16px;
  border: 1px solid rgba(24, 33, 23, 0.1);
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(239, 244, 236, 0.92));
  cursor: pointer;
}

.owner-event-type-item--selected {
  border-color: #182117;
  box-shadow: inset 0 0 0 1px rgba(24, 33, 23, 0.08);
}

.owner-event-type-item__title {
  font-size: 1.05rem;
  font-weight: 600;
}

.owner-event-type-item__duration {
  color: rgba(24, 33, 23, 0.72);
}

.owner-status-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.owner-status-badge {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(24, 33, 23, 0.08);
  color: rgba(24, 33, 23, 0.82);
  font-size: 0.82rem;
}

.owner-field {
  display: grid;
  gap: 8px;
  margin-bottom: 16px;
}

.owner-field input,
.owner-field textarea {
  width: 100%;
  border: 1px solid rgba(24, 33, 23, 0.12);
  border-radius: 18px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.9);
  color: #182117;
}

.owner-form-note {
  margin: 8px 0 0;
  padding: 14px 16px;
  border: 1px solid rgba(24, 33, 23, 0.08);
  border-radius: 16px;
  background: rgba(242, 235, 230, 0.72);
  color: rgba(24, 33, 23, 0.78);
}

.owner-form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 18px;
}

.primary-button,
.secondary-button {
  min-height: 44px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid rgba(24, 33, 23, 0.1);
  cursor: pointer;
}

.primary-button {
  background: #182117;
  color: white;
}

.secondary-button {
  background: rgba(255, 255, 255, 0.86);
  color: #23301f;
}

@media (max-width: 900px) {
  .owner-page {
    grid-template-columns: 1fr;
  }

  .app-nav,
  .owner-card__header {
    align-items: stretch;
    flex-direction: column;
  }
}
```

- [ ] **Step 8: Run the app test file again**

Run:

```bash
npm run frontend:test -- --run apps/frontend/src/App.test.tsx
```

Expected:

```text
FAIL  apps/frontend/src/App.test.tsx
TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Управление типами"
```

- [ ] **Step 9: Commit**

```bash
git add apps/frontend/src/components/AppNav.tsx apps/frontend/src/components/OwnerEventTypeList.tsx apps/frontend/src/components/OwnerEventTypeForm.tsx apps/frontend/src/components/OwnerEventTypesPage.tsx apps/frontend/src/styles.css apps/frontend/src/App.test.tsx
git commit -m "Create owner event types page components"
```

### Task 3: Wire The Owner Page Into The App Shell

**Files:**
- Modify: `apps/frontend/src/App.tsx`
- Test: `apps/frontend/src/App.test.tsx`

- [ ] **Step 1: Update the app integration tests with navigation back to public view**

Append to `apps/frontend/src/App.test.tsx`:

```tsx
  it("returns from the owner page back to the public bookings home", async () => {
    const user = userEvent.setup();

    render(<App scenario="public" />);

    await user.click(screen.getByRole("button", { name: "Управление типами" }));
    await user.click(screen.getByRole("button", { name: "Публичный календарь" }));

    expect(screen.getByRole("heading", { name: "Бронирования" })).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the app tests to verify the navigation test fails**

Run:

```bash
npm run frontend:test -- --run apps/frontend/src/App.test.tsx
```

Expected:

```text
FAIL  apps/frontend/src/App.test.tsx
TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Публичный календарь"
```

- [ ] **Step 3: Add owner/public view state to the app shell**

Update `apps/frontend/src/App.tsx`:

```tsx
import { useEffect, useState } from "react";

import { AppNav } from "./components/AppNav";
import { GuestBookingPage } from "./components/GuestBookingPage";
import { OwnerEventTypesPage } from "./components/OwnerEventTypesPage";
import { PublicBookingsHome } from "./components/PublicBookingsHome";
import {
  bookingSchedule,
  multiEventTypes,
  noEventTypes,
  ownerEventTypes,
  publicBookings,
  singleEventType,
} from "./data/mockGuestFlow";
import {
  buildAvailableDatesByEventType,
  cancelPublicBooking,
  createMockBooking,
  getInitialSelectedDate,
} from "./lib/publicBookings";
import { buildOwnerEventTypeFormState } from "./lib/ownerEventTypes";
import type { Booking, EventType, OwnerEventTypeFormState, OwnerView, ScheduleDay } from "./types";

type AppProps = {
  scenario?: "none" | "single" | "multi" | "public";
};

type ScenarioData = {
  bookings: Booking[];
  eventTypes: EventType[];
  schedule: ScheduleDay[];
};

function getScenarioData(scenario: NonNullable<AppProps["scenario"]>): ScenarioData {
  if (scenario === "none") {
    return {
      bookings: [],
      eventTypes: noEventTypes,
      schedule: bookingSchedule,
    };
  }

  if (scenario === "single") {
    return {
      bookings: [],
      eventTypes: singleEventType,
      schedule: bookingSchedule,
    };
  }

  if (scenario === "multi") {
    return {
      bookings: [],
      eventTypes: multiEventTypes,
      schedule: bookingSchedule,
    };
  }

  return {
    bookings: publicBookings,
    eventTypes: multiEventTypes,
    schedule: bookingSchedule,
  };
}

export default function App({ scenario = "public" }: AppProps) {
  const scenarioData = getScenarioData(scenario);
  const [activeView, setActiveView] = useState<OwnerView>("public");
  const [bookings, setBookings] = useState(scenarioData.bookings);
  const [screen, setScreen] = useState<"home" | "booking">(
    scenarioData.bookings.length > 0 ? "home" : "booking",
  );
  const [successDestination, setSuccessDestination] = useState<"restart" | "home">(
    scenarioData.bookings.length > 0 ? "home" : "restart",
  );
  const [selectedHomeDate, setSelectedHomeDate] = useState(
    getInitialSelectedDate(scenarioData.schedule, scenarioData.bookings),
  );
  const [ownerTypes, setOwnerTypes] = useState(ownerEventTypes);
  const [selectedOwnerTypeId, setSelectedOwnerTypeId] = useState<string | null>(
    ownerEventTypes[1]?.id ?? ownerEventTypes[0]?.id ?? null,
  );
  const [ownerFormState, setOwnerFormState] = useState<OwnerEventTypeFormState>(() =>
    buildOwnerEventTypeFormState("edit", ownerEventTypes[1] ?? ownerEventTypes[0]),
  );

  useEffect(() => {
    const nextScenarioData = getScenarioData(scenario);

    setActiveView("public");
    setBookings(nextScenarioData.bookings);
    setScreen(nextScenarioData.bookings.length > 0 ? "home" : "booking");
    setSuccessDestination(nextScenarioData.bookings.length > 0 ? "home" : "restart");
    setSelectedHomeDate(getInitialSelectedDate(nextScenarioData.schedule, nextScenarioData.bookings));
    setOwnerTypes(ownerEventTypes);
    setSelectedOwnerTypeId(ownerEventTypes[1]?.id ?? ownerEventTypes[0]?.id ?? null);
    setOwnerFormState(buildOwnerEventTypeFormState("edit", ownerEventTypes[1] ?? ownerEventTypes[0]));
  }, [scenario]);

  const datesByEventType = buildAvailableDatesByEventType(
    scenarioData.schedule,
    scenarioData.eventTypes,
    bookings,
  );

  const selectedOwnerType =
    ownerTypes.find((eventType) => eventType.id === selectedOwnerTypeId) ?? undefined;

  useEffect(() => {
    if (selectedOwnerType) {
      setOwnerFormState(buildOwnerEventTypeFormState("edit", selectedOwnerType));
    }
  }, [selectedOwnerType]);

  return (
    <main className="app-shell app-shell--app">
      <AppNav activeView={activeView} onChangeView={setActiveView} />
      {activeView === "owner" ? (
        <OwnerEventTypesPage
          eventTypes={ownerTypes}
          selectedEventTypeId={selectedOwnerTypeId}
          formState={ownerFormState}
          onCreate={() => {
            setSelectedOwnerTypeId(null);
            setOwnerFormState(buildOwnerEventTypeFormState("create"));
          }}
          onSelect={(eventTypeId) => {
            setSelectedOwnerTypeId(eventTypeId);
          }}
          onFormChange={setOwnerFormState}
        />
      ) : screen === "home" ? (
        <PublicBookingsHome
          bookings={bookings}
          eventTypes={scenarioData.eventTypes}
          initialSelectedDate={selectedHomeDate}
          schedule={scenarioData.schedule}
          onCancelBooking={(bookingId) => {
            setBookings((currentBookings) => cancelPublicBooking(currentBookings, bookingId));
          }}
          onStartBooking={(isoDate) => {
            setSelectedHomeDate(isoDate);
            setSuccessDestination("home");
            setScreen("booking");
          }}
        />
      ) : (
        <GuestBookingPage
          eventTypes={scenarioData.eventTypes}
          datesByEventType={datesByEventType}
          initialSelectedDate={selectedHomeDate}
          successActionLabel={
            successDestination === "home" ? "Вернуться к бронированиям" : undefined
          }
          onBookingSubmit={(draft) => {
            setBookings((currentBookings) => [
              ...currentBookings,
              createMockBooking(scenarioData.eventTypes, draft),
            ]);
          }}
          onSuccessAction={
            successDestination === "home"
              ? () => {
                  setScreen("home");
                }
              : undefined
          }
        />
      )}
    </main>
  );
}
```

- [ ] **Step 4: Run the app tests**

Run:

```bash
npm run frontend:test -- --run apps/frontend/src/App.test.tsx
```

Expected:

```text
 PASS  apps/frontend/src/App.test.tsx
  App
```

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/App.tsx apps/frontend/src/App.test.tsx
git commit -m "Wire owner event type page into app shell"
```

### Task 4: Document The New Frontend Scope

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Add owner UI scope to the README**

Update `README.md` in the roles and scenarios sections:

```md
### Владелец календаря (Owner)

- создаёт типы событий
- просматривает список всех бронирований
- на текущем frontend-этапе работает с отдельной UI-страницей управления типами событий

### Управление типами событий
- создание типа события
- просмотр списка активных и архивных типов
- интерфейс редактирования типа события
- mock-сценарии удаления и архивирования без backend-логики
```

- [ ] **Step 2: Add the current owner-page note to repository guidance**

Update `AGENTS.md` in the project status / structure guidance:

```md
The frontend currently includes:

- public guest booking flow
- public bookings home
- owner event types UI page with mock CRUD states only

The owner page is frontend-only for now. Real event type CRUD behavior must still be defined in `spec/` before backend implementation.
```

- [ ] **Step 3: Verify docs changes manually**

Run:

```bash
sed -n '1,220p' README.md
sed -n '1,220p' AGENTS.md
```

Expected:

```text
Owner UI page is described as frontend-only mock behavior and does not claim real backend support.
```

- [ ] **Step 4: Commit**

```bash
git add README.md AGENTS.md
git commit -m "Document owner event types frontend scope"
```

### Task 5: Final Verification

**Files:**
- Test: `apps/frontend/src/lib/ownerEventTypes.test.ts`
- Test: `apps/frontend/src/App.test.tsx`

- [ ] **Step 1: Run the owner helper tests**

Run:

```bash
npm run frontend:test -- --run apps/frontend/src/lib/ownerEventTypes.test.ts
```

Expected:

```text
 PASS  apps/frontend/src/lib/ownerEventTypes.test.ts
```

- [ ] **Step 2: Run the app integration tests**

Run:

```bash
npm run frontend:test -- --run apps/frontend/src/App.test.tsx
```

Expected:

```text
 PASS  apps/frontend/src/App.test.tsx
```

- [ ] **Step 3: Run the frontend production build**

Run:

```bash
npm run frontend:build
```

Expected:

```text
vite v
✓ built in
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend
git commit -m "Finish owner event types UI"
```

## Self-Review

Spec coverage check:

- separate owner page: covered in Tasks 2 and 3
- split desktop / stacked mobile layout: covered in Task 2 styles and page composition
- UI-only CRUD states: covered in Tasks 1, 2, and 3 through mock data and local form state
- archive-only behavior for used types: covered in Task 1 helper rules and Task 2 form rendering
- future concurrency placeholders: partially covered by keeping form and status architecture isolated; no explicit UI placeholder task yet

Gap fixed inline:

- the plan intentionally avoids `spec/` edits because the approved scope is frontend-only UI
- the plan keeps delete/archive as interface states only and does not promise persistence

Type consistency check:

- `EventType` keeps the existing `note` field and reuses it as the owner form description field
- owner navigation uses `OwnerView = "public" | "owner"` consistently
- form state uses `OwnerEventTypeFormState` and `OwnerFormMode` consistently across helpers and components
