# Guest Flow UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first frontend application for the guest booking flow, matching the approved guest-flow UI spec and handling `0 / 1 / 2+` event-type entry states.

**Architecture:** Create a minimal React + TypeScript frontend under `apps/frontend/` with a small local state model and mocked guest-flow data. Keep the UI contract-driven by mapping screens to spec concepts, and isolate rendering into small components: app shell, progress, summary, event-type step, date/time step, contacts step, and status screens.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library

---

## File Structure

Planned files and responsibilities:

- Create: `apps/frontend/package.json` for frontend-local scripts and dependencies
- Create: `apps/frontend/tsconfig.json` for frontend TypeScript settings
- Create: `apps/frontend/vite.config.ts` for Vite + Vitest configuration
- Create: `apps/frontend/index.html` as the Vite entry HTML
- Create: `apps/frontend/src/main.tsx` to mount the app
- Create: `apps/frontend/src/App.tsx` as the composition root
- Create: `apps/frontend/src/styles.css` for the utilitarian visual system
- Create: `apps/frontend/src/types.ts` for guest-flow domain types
- Create: `apps/frontend/src/data/mockGuestFlow.ts` for mocked event types and availability states
- Create: `apps/frontend/src/lib/guestFlow.ts` for entry-state, progress, and summary logic
- Create: `apps/frontend/src/lib/guestFlow.test.ts` for pure logic tests
- Create: `apps/frontend/src/components/GuestBookingPage.tsx` for the top-level guest booking screen
- Create: `apps/frontend/src/components/ProgressSteps.tsx` for dynamic step segments
- Create: `apps/frontend/src/components/SelectionSummary.tsx` for compact selected-value chips/line
- Create: `apps/frontend/src/components/EventTypeStep.tsx` for the multi-event-type step
- Create: `apps/frontend/src/components/DateTimeStep.tsx` for the vertical-stack date/time step
- Create: `apps/frontend/src/components/ContactsStep.tsx` for contact entry and inline error handling
- Create: `apps/frontend/src/components/EmptyState.tsx` for the no-event-types screen
- Create: `apps/frontend/src/components/SuccessState.tsx` for the booking confirmation screen
- Create: `apps/frontend/src/App.test.tsx` for end-to-end-ish guest-flow UI tests
- Modify: `package.json` to add root scripts for frontend development and tests
- Modify: `README.md` to document the new frontend app and local commands
- Modify: `AGENTS.md` to reflect the new `apps/frontend/` structure and tooling

### Task 1: Scaffold The Frontend App

**Files:**
- Create: `apps/frontend/package.json`
- Create: `apps/frontend/tsconfig.json`
- Create: `apps/frontend/vite.config.ts`
- Create: `apps/frontend/index.html`
- Create: `apps/frontend/src/main.tsx`
- Create: `apps/frontend/src/App.tsx`
- Create: `apps/frontend/src/styles.css`
- Modify: `package.json`

- [ ] **Step 1: Write the failing smoke test setup**

Create `apps/frontend/src/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "./App";

describe("App", () => {
  it("renders the guest booking heading", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Запись пока недоступна" }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run frontend:test -- --run
```

Expected:

```text
FAIL  apps/frontend/src/App.test.tsx
Error: Cannot find module './App'
```

- [ ] **Step 3: Add the minimal frontend scaffold**

Create `apps/frontend/package.json`:

```json
{
  "name": "@callplanner/frontend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^19.1.2",
    "@types/react-dom": "^19.1.2",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^26.0.0",
    "typescript": "^5.8.3",
    "vite": "^6.3.5",
    "vitest": "^3.1.2"
  }
}
```

Create `apps/frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "references": []
}
```

Create `apps/frontend/vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/testSetup.ts",
  },
});
```

Create `apps/frontend/src/testSetup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Create `apps/frontend/index.html`:

```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Call Calendar</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `apps/frontend/src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

Create `apps/frontend/src/App.tsx`:

```tsx
export default function App() {
  return (
    <main className="app-shell">
      <section className="panel">
        <h1>Запись пока недоступна</h1>
        <p>Организатор еще не настроил доступные встречи. Попробуйте зайти позже.</p>
      </section>
    </main>
  );
}
```

Create `apps/frontend/src/styles.css`:

```css
:root {
  color-scheme: light;
  font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
  background: #f5f8f2;
  color: #182117;
}

body {
  margin: 0;
  min-width: 320px;
  background: #f5f8f2;
}

.app-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.panel {
  width: min(100%, 720px);
  padding: 32px;
  border: 1px solid #d9e2d5;
  border-radius: 16px;
  background: #ffffff;
}
```

Modify root `package.json`:

```json
{
  "name": "callplanner",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "spec:compile": "tsp compile spec",
    "spec:format": "tsp format \"spec/**/*.tsp\"",
    "frontend:dev": "npm --prefix apps/frontend run dev",
    "frontend:build": "npm --prefix apps/frontend run build",
    "frontend:test": "npm --prefix apps/frontend run test"
  },
  "dependencies": {
    "@typespec/compiler": "latest",
    "@typespec/http": "latest",
    "@typespec/rest": "latest",
    "@typespec/openapi": "latest",
    "@typespec/openapi3": "latest"
  }
}
```

- [ ] **Step 4: Install frontend dependencies**

Run:

```bash
npm install --prefix apps/frontend
```

Expected:

```text
added <N> packages
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
npm run frontend:test -- --run
```

Expected:

```text
PASS  apps/frontend/src/App.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add package.json apps/frontend/package.json apps/frontend/tsconfig.json apps/frontend/vite.config.ts apps/frontend/index.html apps/frontend/src/main.tsx apps/frontend/src/App.tsx apps/frontend/src/styles.css apps/frontend/src/testSetup.ts apps/frontend/src/App.test.tsx package-lock.json apps/frontend/package-lock.json
git commit -m "feat: scaffold guest flow frontend app"
```

### Task 2: Add Guest-Flow Domain Logic

**Files:**
- Create: `apps/frontend/src/types.ts`
- Create: `apps/frontend/src/data/mockGuestFlow.ts`
- Create: `apps/frontend/src/lib/guestFlow.ts`
- Create: `apps/frontend/src/lib/guestFlow.test.ts`

- [ ] **Step 1: Write the failing pure-logic tests**

Create `apps/frontend/src/lib/guestFlow.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  buildProgressSteps,
  deriveEntryState,
  formatSummary,
} from "./guestFlow";

describe("deriveEntryState", () => {
  it("returns unavailable for zero event types", () => {
    expect(deriveEntryState([]).kind).toBe("unavailable");
  });

  it("returns direct-booking for one event type", () => {
    expect(deriveEntryState([{ id: "solo", title: "30 минут", durationMinutes: 30 }]).kind).toBe("direct-booking");
  });

  it("returns choose-event-type for multiple event types", () => {
    expect(
      deriveEntryState([
        { id: "a", title: "15 минут", durationMinutes: 15 },
        { id: "b", title: "30 минут", durationMinutes: 30 },
      ]).kind,
    ).toBe("choose-event-type");
  });
});

describe("buildProgressSteps", () => {
  it("omits event type step for direct booking", () => {
    expect(buildProgressSteps("direct-booking")).toEqual([
      "Дата и время",
      "Контакты",
    ]);
  });
});

describe("formatSummary", () => {
  it("formats event type, full date, and time in one line", () => {
    expect(
      formatSummary({
        eventTypeTitle: "30 минут",
        fullDateLabel: "Среда, 15 апреля",
        timeLabel: "10:30",
      }),
    ).toBe("30 минут • Среда, 15 апреля • 10:30");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run frontend:test -- --run apps/frontend/src/lib/guestFlow.test.ts
```

Expected:

```text
FAIL  apps/frontend/src/lib/guestFlow.test.ts
Error: Cannot find module './guestFlow'
```

- [ ] **Step 3: Add the domain types, mock data, and pure logic**

Create `apps/frontend/src/types.ts`:

```ts
export type EventType = {
  id: string;
  title: string;
  durationMinutes: number;
  note?: string;
};

export type SlotDate = {
  isoDate: string;
  weekdayShort: string;
  dayNumber: string;
  fullLabel: string;
  slots: string[];
};

export type EntryStateKind = "unavailable" | "direct-booking" | "choose-event-type";

export type GuestFlowSummary = {
  eventTypeTitle?: string;
  fullDateLabel?: string;
  timeLabel?: string;
};
```

Create `apps/frontend/src/data/mockGuestFlow.ts`:

```ts
import type { EventType, SlotDate } from "../types";

export const multiEventTypes: EventType[] = [
  { id: "intro", title: "15 минут", durationMinutes: 15 },
  { id: "standard", title: "30 минут", durationMinutes: 30 },
  { id: "deep-dive", title: "60 минут", durationMinutes: 60 },
];

export const singleEventType: EventType[] = [
  { id: "standard", title: "30 минут", durationMinutes: 30 },
];

export const noEventTypes: EventType[] = [];

export const slotDates: SlotDate[] = [
  {
    isoDate: "2026-04-15",
    weekdayShort: "Ср",
    dayNumber: "15",
    fullLabel: "Среда, 15 апреля",
    slots: ["09:00", "10:30", "13:00", "16:30"],
  },
  {
    isoDate: "2026-04-16",
    weekdayShort: "Чт",
    dayNumber: "16",
    fullLabel: "Четверг, 16 апреля",
    slots: [],
  },
];
```

Create `apps/frontend/src/lib/guestFlow.ts`:

```ts
import type { EntryStateKind, EventType, GuestFlowSummary } from "../types";

export function deriveEntryState(eventTypes: EventType[]) {
  if (eventTypes.length === 0) {
    return { kind: "unavailable" as EntryStateKind };
  }

  if (eventTypes.length === 1) {
    return { kind: "direct-booking" as EntryStateKind, presetEventType: eventTypes[0] };
  }

  return { kind: "choose-event-type" as EntryStateKind };
}

export function buildProgressSteps(kind: EntryStateKind) {
  if (kind === "direct-booking") {
    return ["Дата и время", "Контакты"];
  }

  if (kind === "choose-event-type") {
    return ["Тип встречи", "Дата и время", "Контакты"];
  }

  return [];
}

export function formatSummary(summary: GuestFlowSummary) {
  return [summary.eventTypeTitle, summary.fullDateLabel, summary.timeLabel]
    .filter(Boolean)
    .join(" • ");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm run frontend:test -- --run apps/frontend/src/lib/guestFlow.test.ts
```

Expected:

```text
PASS  apps/frontend/src/lib/guestFlow.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/types.ts apps/frontend/src/data/mockGuestFlow.ts apps/frontend/src/lib/guestFlow.ts apps/frontend/src/lib/guestFlow.test.ts
git commit -m "feat: add guest flow state model"
```

### Task 3: Build The App Shell, Entry States, And Dynamic Progress

**Files:**
- Create: `apps/frontend/src/components/GuestBookingPage.tsx`
- Create: `apps/frontend/src/components/ProgressSteps.tsx`
- Create: `apps/frontend/src/components/SelectionSummary.tsx`
- Create: `apps/frontend/src/components/EmptyState.tsx`
- Modify: `apps/frontend/src/App.tsx`
- Modify: `apps/frontend/src/App.test.tsx`
- Modify: `apps/frontend/src/styles.css`

- [ ] **Step 1: Write the failing integration tests**

Update `apps/frontend/src/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "./App";

describe("App", () => {
  it("shows the unavailable state when there are no event types", () => {
    render(<App scenario="none" />);

    expect(screen.getByRole("heading", { name: "Запись пока недоступна" })).toBeInTheDocument();
  });

  it("shows two-step progress when only one event type exists", () => {
    render(<App scenario="single" />);

    expect(screen.getByText("Дата и время")).toBeInTheDocument();
    expect(screen.getByText("Контакты")).toBeInTheDocument();
    expect(screen.queryByText("Тип встречи")).not.toBeInTheDocument();
  });

  it("shows three-step progress when multiple event types exist", () => {
    render(<App scenario="multi" />);

    expect(screen.getByText("Тип встречи")).toBeInTheDocument();
    expect(screen.getByText("Дата и время")).toBeInTheDocument();
    expect(screen.getByText("Контакты")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run frontend:test -- --run apps/frontend/src/App.test.tsx
```

Expected:

```text
FAIL
Property 'scenario' does not exist on type ...
```

- [ ] **Step 3: Add the app shell and entry-state components**

Create `apps/frontend/src/components/EmptyState.tsx`:

```tsx
export function EmptyState() {
  return (
    <section className="panel">
      <h1>Запись пока недоступна</h1>
      <p>Организатор еще не настроил доступные встречи. Попробуйте зайти позже.</p>
    </section>
  );
}
```

Create `apps/frontend/src/components/ProgressSteps.tsx`:

```tsx
type ProgressStepsProps = {
  steps: string[];
  activeIndex: number;
};

export function ProgressSteps({ steps, activeIndex }: ProgressStepsProps) {
  return (
    <ol className="progress-steps" aria-label="Прогресс бронирования">
      {steps.map((step, index) => {
        const state =
          index < activeIndex ? "done" : index === activeIndex ? "active" : "upcoming";

        return (
          <li key={step} className={`progress-step progress-step--${state}`}>
            <span className="progress-step__index">{index + 1}</span>
            <span>{step}</span>
          </li>
        );
      })}
    </ol>
  );
}
```

Create `apps/frontend/src/components/SelectionSummary.tsx`:

```tsx
type SelectionSummaryProps = {
  value: string;
};

export function SelectionSummary({ value }: SelectionSummaryProps) {
  if (!value) {
    return null;
  }

  return <p className="selection-summary">{value}</p>;
}
```

Create `apps/frontend/src/components/GuestBookingPage.tsx`:

```tsx
import { buildProgressSteps, deriveEntryState, formatSummary } from "../lib/guestFlow";
import type { EventType } from "../types";
import { EmptyState } from "./EmptyState";
import { ProgressSteps } from "./ProgressSteps";
import { SelectionSummary } from "./SelectionSummary";

type GuestBookingPageProps = {
  eventTypes: EventType[];
};

export function GuestBookingPage({ eventTypes }: GuestBookingPageProps) {
  const entryState = deriveEntryState(eventTypes);

  if (entryState.kind === "unavailable") {
    return <EmptyState />;
  }

  const steps = buildProgressSteps(entryState.kind);
  const summary = formatSummary({
    eventTypeTitle: entryState.kind === "direct-booking" ? entryState.presetEventType.title : undefined,
  });

  return (
    <section className="panel">
      <ProgressSteps steps={steps} activeIndex={0} />
      <SelectionSummary value={summary} />
      <h1>{entryState.kind === "direct-booking" ? "Выберите дату и время" : "Выберите тип встречи"}</h1>
      <p>
        {entryState.kind === "direct-booking"
          ? "Выберите свободный слот на ближайшие 14 дней."
          : "Выберите формат встречи, чтобы перейти к выбору слота."}
      </p>
    </section>
  );
}
```

Update `apps/frontend/src/App.tsx`:

```tsx
import { multiEventTypes, noEventTypes, singleEventType } from "./data/mockGuestFlow";
import { GuestBookingPage } from "./components/GuestBookingPage";

type AppProps = {
  scenario?: "none" | "single" | "multi";
};

export default function App({ scenario = "none" }: AppProps) {
  const eventTypes =
    scenario === "multi"
      ? multiEventTypes
      : scenario === "single"
        ? singleEventType
        : noEventTypes;

  return (
    <main className="app-shell">
      <GuestBookingPage eventTypes={eventTypes} />
    </main>
  );
}
```

Update `apps/frontend/src/styles.css` with:

```css
.progress-steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  gap: 8px;
  padding: 0;
  margin: 0 0 16px;
  list-style: none;
}

.progress-step {
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid #d9e2d5;
  border-radius: 10px;
  background: #edf3eb;
  color: #667562;
  font-size: 14px;
}

.progress-step--active {
  border-color: #7fb287;
  background: #e1efe2;
  color: #182117;
}

.progress-step--done {
  color: #182117;
}

.progress-step__index {
  font-size: 12px;
}

.selection-summary {
  margin: 0 0 12px;
  color: #4a5846;
  font-size: 14px;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm run frontend:test -- --run apps/frontend/src/App.test.tsx
```

Expected:

```text
PASS  apps/frontend/src/App.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/components/GuestBookingPage.tsx apps/frontend/src/components/ProgressSteps.tsx apps/frontend/src/components/SelectionSummary.tsx apps/frontend/src/components/EmptyState.tsx apps/frontend/src/App.tsx apps/frontend/src/App.test.tsx apps/frontend/src/styles.css
git commit -m "feat: add guest flow shell and progress states"
```

### Task 4: Implement Event-Type Selection And Date-Time Step

**Files:**
- Create: `apps/frontend/src/components/EventTypeStep.tsx`
- Create: `apps/frontend/src/components/DateTimeStep.tsx`
- Modify: `apps/frontend/src/components/GuestBookingPage.tsx`
- Modify: `apps/frontend/src/App.test.tsx`
- Modify: `apps/frontend/src/styles.css`

- [ ] **Step 1: Write the failing interaction tests**

Update `apps/frontend/src/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import App from "./App";

describe("guest booking flow", () => {
  it("requires event type selection before continuing", async () => {
    const user = userEvent.setup();

    render(<App scenario="multi" />);

    expect(screen.getByRole("button", { name: "Далее" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "30 минут" }));

    expect(screen.getByRole("button", { name: "Далее" })).toBeEnabled();
  });

  it("shows the selected event type above the date and time step", async () => {
    const user = userEvent.setup();

    render(<App scenario="multi" />);

    await user.click(screen.getByRole("button", { name: "30 минут" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));

    expect(screen.getByText("30 минут")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Выберите дату и время" })).toBeInTheDocument();
  });

  it("shows compact weekdays in the calendar and a full date above slots", async () => {
    render(<App scenario="single" />);

    expect(screen.getByText("Ср")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("Среда, 15 апреля")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run frontend:test -- --run apps/frontend/src/App.test.tsx
```

Expected:

```text
FAIL
Unable to find role="button" and name "30 минут"
```

- [ ] **Step 3: Add event-type and date/time UI**

Create `apps/frontend/src/components/EventTypeStep.tsx`:

```tsx
import type { EventType } from "../types";

type EventTypeStepProps = {
  eventTypes: EventType[];
  selectedEventTypeId?: string;
  onSelect: (eventTypeId: string) => void;
};

export function EventTypeStep({
  eventTypes,
  selectedEventTypeId,
  onSelect,
}: EventTypeStepProps) {
  return (
    <div className="stack">
      {eventTypes.map((eventType) => {
        const selected = eventType.id === selectedEventTypeId;

        return (
          <button
            key={eventType.id}
            type="button"
            className={`choice-card${selected ? " choice-card--selected" : ""}`}
            onClick={() => onSelect(eventType.id)}
          >
            <span>{eventType.title}</span>
            <span>{eventType.durationMinutes} минут</span>
          </button>
        );
      })}
    </div>
  );
}
```

Create `apps/frontend/src/components/DateTimeStep.tsx`:

```tsx
import type { SlotDate } from "../types";

type DateTimeStepProps = {
  dates: SlotDate[];
  selectedDate?: string;
  selectedTime?: string;
  onSelectDate: (isoDate: string) => void;
  onSelectTime: (time: string) => void;
};

export function DateTimeStep({
  dates,
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
}: DateTimeStepProps) {
  const activeDate = dates.find((date) => date.isoDate === selectedDate) ?? dates[0];

  return (
    <div className="stack">
      <div className="calendar-grid">
        {dates.map((date) => {
          const active = date.isoDate === activeDate.isoDate;

          return (
            <button
              key={date.isoDate}
              type="button"
              className={`calendar-day${active ? " calendar-day--selected" : ""}`}
              onClick={() => onSelectDate(date.isoDate)}
            >
              <span>{date.weekdayShort}</span>
              <span>{date.dayNumber}</span>
            </button>
          );
        })}
      </div>

      <p className="slot-date-label">{activeDate.fullLabel}</p>

      {activeDate.slots.length === 0 ? (
        <p className="empty-copy">На выбранный день свободных слотов нет. Выберите другую дату.</p>
      ) : (
        <div className="slot-grid">
          {activeDate.slots.map((slot) => (
            <button
              key={slot}
              type="button"
              className={`slot-button${slot === selectedTime ? " slot-button--selected" : ""}`}
              onClick={() => onSelectTime(slot)}
            >
              {slot}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

Update `apps/frontend/src/components/GuestBookingPage.tsx`:

```tsx
import { useState } from "react";

import { slotDates } from "../data/mockGuestFlow";
import { buildProgressSteps, deriveEntryState, formatSummary } from "../lib/guestFlow";
import type { EventType } from "../types";
import { DateTimeStep } from "./DateTimeStep";
import { EmptyState } from "./EmptyState";
import { EventTypeStep } from "./EventTypeStep";
import { ProgressSteps } from "./ProgressSteps";
import { SelectionSummary } from "./SelectionSummary";

type GuestBookingPageProps = {
  eventTypes: EventType[];
};

export function GuestBookingPage({ eventTypes }: GuestBookingPageProps) {
  const entryState = deriveEntryState(eventTypes);
  const [currentStep, setCurrentStep] = useState(entryState.kind === "choose-event-type" ? 0 : 1);
  const [selectedEventTypeId, setSelectedEventTypeId] = useState(
    entryState.kind === "direct-booking" ? entryState.presetEventType.id : "",
  );
  const [selectedDate, setSelectedDate] = useState(slotDates[0]?.isoDate ?? "");
  const [selectedTime, setSelectedTime] = useState("");

  if (entryState.kind === "unavailable") {
    return <EmptyState />;
  }

  const steps = buildProgressSteps(entryState.kind);
  const selectedEventType = eventTypes.find((eventType) => eventType.id === selectedEventTypeId);
  const activeDate = slotDates.find((date) => date.isoDate === selectedDate) ?? slotDates[0];

  const summary = formatSummary({
    eventTypeTitle: selectedEventType?.title,
    fullDateLabel: currentStep > 1 ? activeDate?.fullLabel : undefined,
    timeLabel: currentStep > 1 ? selectedTime : undefined,
  });

  const canContinue =
    currentStep === 0 ? Boolean(selectedEventTypeId) : currentStep === 1 ? Boolean(selectedTime) : true;

  return (
    <section className="panel">
      <ProgressSteps steps={steps} activeIndex={entryState.kind === "choose-event-type" ? currentStep : currentStep - 1} />
      <SelectionSummary value={summary} />
      <h1>{currentStep === 0 ? "Выберите тип встречи" : "Выберите дату и время"}</h1>
      <p>
        {currentStep === 0
          ? "Выберите формат встречи, чтобы перейти к выбору слота."
          : "Выберите свободный слот на ближайшие 14 дней."}
      </p>

      {currentStep === 0 ? (
        <EventTypeStep
          eventTypes={eventTypes}
          selectedEventTypeId={selectedEventTypeId}
          onSelect={setSelectedEventTypeId}
        />
      ) : (
        <DateTimeStep
          dates={slotDates}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          onSelectDate={(isoDate) => {
            setSelectedDate(isoDate);
            setSelectedTime("");
          }}
          onSelectTime={setSelectedTime}
        />
      )}

      <div className="actions">
        {currentStep > (entryState.kind === "choose-event-type" ? 0 : 1) ? (
          <button type="button" className="secondary-button" onClick={() => setCurrentStep(currentStep - 1)}>
            Назад
          </button>
        ) : (
          <span />
        )}
        <button type="button" className="primary-button" disabled={!canContinue} onClick={() => setCurrentStep(currentStep + 1)}>
          Далее
        </button>
      </div>
    </section>
  );
}
```

Update `apps/frontend/src/styles.css` with:

```css
.stack {
  display: grid;
  gap: 12px;
}

.choice-card,
.calendar-day,
.slot-button {
  display: grid;
  gap: 4px;
  width: 100%;
  padding: 12px;
  border: 1px solid #d9e2d5;
  border-radius: 10px;
  background: #fff;
  color: #182117;
  text-align: left;
}

.choice-card--selected,
.calendar-day--selected,
.slot-button--selected {
  border-color: #7fb287;
  background: #e1efe2;
}

.calendar-grid,
.slot-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.slot-date-label {
  margin: 0;
  color: #4a5846;
}

.actions {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

.primary-button,
.secondary-button {
  min-width: 120px;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid #d9e2d5;
}

.primary-button {
  background: #182117;
  color: #fff;
}

.secondary-button {
  background: #edf3eb;
  color: #182117;
}

.empty-copy {
  margin: 0;
  color: #667562;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm run frontend:test -- --run apps/frontend/src/App.test.tsx
```

Expected:

```text
PASS  apps/frontend/src/App.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/components/EventTypeStep.tsx apps/frontend/src/components/DateTimeStep.tsx apps/frontend/src/components/GuestBookingPage.tsx apps/frontend/src/App.test.tsx apps/frontend/src/styles.css
git commit -m "feat: add event type and slot selection steps"
```

### Task 5: Implement Contacts, Submission States, And Success Screen

**Files:**
- Create: `apps/frontend/src/components/ContactsStep.tsx`
- Create: `apps/frontend/src/components/SuccessState.tsx`
- Modify: `apps/frontend/src/components/GuestBookingPage.tsx`
- Modify: `apps/frontend/src/App.test.tsx`
- Modify: `apps/frontend/src/styles.css`

- [ ] **Step 1: Write the failing tests for the final step**

Update `apps/frontend/src/App.test.tsx`:

```tsx
it("shows the selected event type, full date, and time on the contacts step", async () => {
  const user = userEvent.setup();

  render(<App scenario="single" />);

  await user.click(screen.getByRole("button", { name: "10:30" }));
  await user.click(screen.getByRole("button", { name: "Далее" }));

  expect(screen.getByText("30 минут • Среда, 15 апреля • 10:30")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Подтвердить" })).toBeInTheDocument();
});

it("shows the success screen after valid contact submission", async () => {
  const user = userEvent.setup();

  render(<App scenario="single" />);

  await user.click(screen.getByRole("button", { name: "10:30" }));
  await user.click(screen.getByRole("button", { name: "Далее" }));
  await user.type(screen.getByLabelText("Имя"), "Иван");
  await user.type(screen.getByLabelText("Email"), "ivan@example.com");
  await user.click(screen.getByRole("button", { name: "Подтвердить" }));

  expect(screen.getByRole("heading", { name: "Бронирование подтверждено" })).toBeInTheDocument();
  expect(screen.getByText("30 минут • Среда, 15 апреля • 10:30")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run frontend:test -- --run apps/frontend/src/App.test.tsx
```

Expected:

```text
FAIL
Unable to find label text "Имя"
```

- [ ] **Step 3: Add contacts and success UI**

Create `apps/frontend/src/components/ContactsStep.tsx`:

```tsx
type ContactsStepProps = {
  name: string;
  email: string;
  error?: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
};

export function ContactsStep({
  name,
  email,
  error,
  onNameChange,
  onEmailChange,
}: ContactsStepProps) {
  return (
    <div className="stack">
      <label className="field">
        <span>Имя</span>
        <input value={name} onChange={(event) => onNameChange(event.target.value)} />
      </label>
      <label className="field">
        <span>Email</span>
        <input value={email} onChange={(event) => onEmailChange(event.target.value)} />
      </label>
      {error ? <p className="error-copy">{error}</p> : null}
    </div>
  );
}
```

Create `apps/frontend/src/components/SuccessState.tsx`:

```tsx
type SuccessStateProps = {
  summary: string;
};

export function SuccessState({ summary }: SuccessStateProps) {
  return (
    <section className="panel">
      <h1>Бронирование подтверждено</h1>
      <p>{summary}</p>
    </section>
  );
}
```

Update `apps/frontend/src/components/GuestBookingPage.tsx`:

```tsx
import { useState } from "react";

import { slotDates } from "../data/mockGuestFlow";
import { buildProgressSteps, deriveEntryState, formatSummary } from "../lib/guestFlow";
import type { EventType } from "../types";
import { ContactsStep } from "./ContactsStep";
import { DateTimeStep } from "./DateTimeStep";
import { EmptyState } from "./EmptyState";
import { EventTypeStep } from "./EventTypeStep";
import { ProgressSteps } from "./ProgressSteps";
import { SelectionSummary } from "./SelectionSummary";
import { SuccessState } from "./SuccessState";

export function GuestBookingPage({ eventTypes }: { eventTypes: EventType[] }) {
  const entryState = deriveEntryState(eventTypes);
  const [currentStep, setCurrentStep] = useState(entryState.kind === "choose-event-type" ? 0 : 1);
  const [selectedEventTypeId, setSelectedEventTypeId] = useState(
    entryState.kind === "direct-booking" ? entryState.presetEventType.id : "",
  );
  const [selectedDate, setSelectedDate] = useState(slotDates[0]?.isoDate ?? "");
  const [selectedTime, setSelectedTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (entryState.kind === "unavailable") {
    return <EmptyState />;
  }

  const steps = buildProgressSteps(entryState.kind);
  const selectedEventType = eventTypes.find((eventType) => eventType.id === selectedEventTypeId);
  const activeDate = slotDates.find((date) => date.isoDate === selectedDate) ?? slotDates[0];
  const summary = formatSummary({
    eventTypeTitle: selectedEventType?.title,
    fullDateLabel: activeDate?.fullLabel,
    timeLabel: selectedTime,
  });

  if (submitted) {
    return <SuccessState summary={summary} />;
  }

  const activeIndex = entryState.kind === "choose-event-type" ? currentStep : currentStep - 1;
  const isContactsStep = activeIndex === steps.length - 1;
  const canContinue =
    activeIndex === 0 && entryState.kind === "choose-event-type"
      ? Boolean(selectedEventTypeId)
      : activeIndex === (entryState.kind === "choose-event-type" ? 1 : 0)
        ? Boolean(selectedTime)
        : Boolean(name && email);

  const submit = () => {
    if (!name || !email) {
      setError("Заполните имя и email, чтобы подтвердить бронирование.");
      return;
    }

    setError("");
    setSubmitted(true);
  };

  return (
    <section className="panel">
      <ProgressSteps steps={steps} activeIndex={activeIndex} />
      <SelectionSummary value={activeIndex > 0 ? summary : selectedEventType?.title ?? ""} />
      <h1>
        {activeIndex === 0 && entryState.kind === "choose-event-type"
          ? "Выберите тип встречи"
          : activeIndex === steps.length - 1
            ? "Введите контактные данные"
            : "Выберите дату и время"}
      </h1>

      {activeIndex === 0 && entryState.kind === "choose-event-type" ? (
        <EventTypeStep
          eventTypes={eventTypes}
          selectedEventTypeId={selectedEventTypeId}
          onSelect={setSelectedEventTypeId}
        />
      ) : isContactsStep ? (
        <ContactsStep
          name={name}
          email={email}
          error={error}
          onNameChange={setName}
          onEmailChange={setEmail}
        />
      ) : (
        <DateTimeStep
          dates={slotDates}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          onSelectDate={(isoDate) => {
            setSelectedDate(isoDate);
            setSelectedTime("");
          }}
          onSelectTime={setSelectedTime}
        />
      )}

      <div className="actions">
        {activeIndex > 0 ? (
          <button type="button" className="secondary-button" onClick={() => setCurrentStep(currentStep - 1)}>
            Назад
          </button>
        ) : (
          <span />
        )}
        {isContactsStep ? (
          <button type="button" className="primary-button" disabled={!canContinue} onClick={submit}>
            Подтвердить
          </button>
        ) : (
          <button type="button" className="primary-button" disabled={!canContinue} onClick={() => setCurrentStep(currentStep + 1)}>
            Далее
          </button>
        )}
      </div>
    </section>
  );
}
```

Update `apps/frontend/src/styles.css` with:

```css
.field {
  display: grid;
  gap: 6px;
}

.field input {
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid #d9e2d5;
  border-radius: 10px;
  font: inherit;
}

.error-copy {
  margin: 0;
  color: #9b2c2c;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm run frontend:test -- --run apps/frontend/src/App.test.tsx
```

Expected:

```text
PASS  apps/frontend/src/App.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/components/ContactsStep.tsx apps/frontend/src/components/SuccessState.tsx apps/frontend/src/components/GuestBookingPage.tsx apps/frontend/src/App.test.tsx apps/frontend/src/styles.css
git commit -m "feat: complete guest booking flow"
```

### Task 6: Document Tooling And Verify The Frontend

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Write the failing documentation check**

Run:

```bash
rg -n "frontend:dev|apps/frontend|frontend:test" README.md AGENTS.md
```

Expected:

```text
no matches
```

- [ ] **Step 2: Update repository docs**

Update `README.md` by extending the structure and run commands sections with:

```md
## 📁 Структура репозитория

```
/spec            # TypeSpec API контракт
/apps
/frontend      # frontend приложение
/backend       # backend приложение
```

## ▶️ Запуск

Сборка TypeSpec-контракта:

```bash
npm run spec:compile
```

Форматирование файлов контракта:

```bash
npm run spec:format
```

Запуск frontend-приложения:

```bash
npm run frontend:dev
```

Запуск frontend-тестов:

```bash
npm run frontend:test -- --run
```
```

Update `AGENTS.md` by extending the `Build, Test, and Development` and `Testing` sections with:

```md
Frontend commands are available once `apps/frontend/` exists:

```bash
npm run frontend:dev
npm run frontend:build
npm run frontend:test -- --run
```

When frontend tests are present:

- place component and interaction tests in `apps/frontend/src/`
- keep pure state logic tests near `apps/frontend/src/lib/`
- document any new frontend tooling in `README.md`
```

- [ ] **Step 3: Run docs and test verification**

Run:

```bash
rg -n "frontend:dev|apps/frontend|frontend:test" README.md AGENTS.md
npm run frontend:test -- --run
npm run frontend:build
```

Expected:

```text
README.md:<line>:npm run frontend:dev
AGENTS.md:<line>:npm run frontend:test -- --run
PASS  ...
vite v...
✓ built in ...
```

- [ ] **Step 4: Commit**

```bash
git add README.md AGENTS.md
git commit -m "docs: add frontend workflow guidance"
```

## Self-Review

Spec coverage check:

- entry states for `0 / 1 / 2+` event types are covered in Tasks 2 and 3
- dynamic progress is covered in Tasks 2 and 3
- compact selection summary is covered in Tasks 2, 3, 4, and 5
- utilitarian visual tone is covered in Tasks 1, 3, 4, and 5 through shared styles
- vertical-stack date/time step is covered in Task 4
- hybrid day-of-week format is covered in Task 4
- no-slots empty state is covered in Task 4
- contacts, inline error, and success state are covered in Task 5
- repository structure and tooling docs are covered in Task 6

Placeholder scan:

- no `TODO`, `TBD`, or deferred implementation markers remain
- every task lists exact files
- every test step contains exact commands and expected outcomes

Type consistency check:

- entry-state naming is consistent: `unavailable`, `direct-booking`, `choose-event-type`
- summary formatting uses the same `event type • full date • time` ordering across all tasks
- date labels are consistent between tests and UI snippets

