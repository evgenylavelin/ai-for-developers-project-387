# Playwright E2E Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Playwright-based browser tests that cover the three main guest booking scenarios and run them in CI.

**Architecture:** Keep the API contract unchanged and add a root-level Playwright harness that drives the existing frontend and backend together. Prepare backend state through existing HTTP endpoints, run the guest booking path in a real browser, and wire the suite into GitHub Actions plus repo documentation.

**Tech Stack:** Playwright, TypeScript, Vite, Fastify, GitHub Actions, npm workspaces-by-prefix

---

## File Map

- Modify: `package.json`
  Purpose: add root e2e scripts for Playwright and browser install.
- Create: `playwright.config.ts`
  Purpose: define the browser test runner, dev server startup, base URL, and artifacts.
- Create: `tests/e2e/booking-flow.spec.ts`
  Purpose: cover successful booking, slot conflict, and validation errors.
- Create: `tests/e2e/helpers/api.ts`
  Purpose: prepare backend state through existing endpoints and keep the spec readable.
- Create: `.github/workflows/e2e.yml`
  Purpose: run browser tests in GitHub Actions and upload artifacts on failure.
- Modify: `README.md`
  Purpose: document Playwright, local commands, and test location.
- Modify: `AGENTS.md`
  Purpose: keep repository guidance aligned with the new local e2e tooling.

### Task 1: Add Root-Level Playwright Tooling

**Files:**
- Modify: `package.json`
- Create: `playwright.config.ts`

- [ ] **Step 1: Add failing root scripts and Playwright dependency declarations**

Update `package.json` to add the minimal e2e commands:

```json
{
  "scripts": {
    "e2e:test": "playwright test",
    "e2e:test:headed": "playwright test --headed",
    "e2e:install": "playwright install --with-deps chromium"
  },
  "devDependencies": {
    "@playwright/test": "^1.54.0"
  }
}
```

Keep the existing scripts unchanged.

- [ ] **Step 2: Add the initial Playwright config**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

const frontendPort = Number(process.env.PLAYWRIGHT_FRONTEND_PORT ?? 4173);
const backendPort = Number(process.env.PLAYWRIGHT_BACKEND_PORT ?? 3001);
const baseURL = `http://127.0.0.1:${frontendPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: `npm run backend:dev -- --host 0.0.0.0 --port ${backendPort}`,
      port: backendPort,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `VITE_API_BASE_URL=http://127.0.0.1:${backendPort} npm run frontend:dev -- --host 0.0.0.0 --port ${frontendPort}`,
      port: frontendPort,
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
```

Note: if the root scripts do not forward extra CLI args cleanly, adjust the `command` strings to use `npm --prefix apps/backend run dev` and `npm --prefix apps/frontend run dev -- --host ...`.

- [ ] **Step 3: Install dependencies and verify Playwright sees the empty suite**

Run:

```bash
npm install
npm run e2e:install
npm run e2e:test
```

Expected: Playwright starts, reports no tests found or fails because `tests/e2e` does not exist yet.

- [ ] **Step 4: Commit the tooling baseline**

```bash
git add package.json package-lock.json playwright.config.ts
git commit -m "Add Playwright e2e tooling"
```

### Task 2: Add Backend Setup Helpers And Browser Scenarios

**Files:**
- Create: `tests/e2e/helpers/api.ts`
- Create: `tests/e2e/booking-flow.spec.ts`

- [ ] **Step 1: Write the failing Playwright spec**

Create `tests/e2e/booking-flow.spec.ts` with all three scenario shells first:

```ts
import { expect, test } from "@playwright/test";

test.describe("guest booking flow", () => {
  test("books a slot successfully", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Бронирования" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Записаться" })).toBeEnabled();
  });

  test("shows a conflict when the slot becomes unavailable before submit", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Бронирования" })).toBeVisible();
  });

  test("shows validation errors for empty and invalid contacts", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Бронирования" })).toBeVisible();
  });
});
```

These tests should fail until backend state preparation is added because the app starts with no event types and no public booking entry.

- [ ] **Step 2: Run the failing browser tests**

Run:

```bash
npm run e2e:test
```

Expected: FAIL because the app does not expose a bookable public flow without test setup data.

- [ ] **Step 3: Add API setup helpers**

Create `tests/e2e/helpers/api.ts`:

```ts
type OwnerSchedule = {
  workingDays: string[];
  startTime: string;
  endTime: string;
};

type EventType = {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
};

type AvailableSlot = {
  startAt: string;
  endAt: string;
};

type Booking = {
  id: string;
  eventTypeId: string;
  startAt: string;
  endAt: string;
  guestName: string;
  guestEmail: string;
  status: string;
};

const apiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:3001";

async function expectOk(response: Response, context: string) {
  if (!response.ok) {
    throw new Error(`${context} failed with ${response.status}: ${await response.text()}`);
  }
}

export async function prepareBookableEventType() {
  const schedule: OwnerSchedule = {
    workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    startTime: "09:00",
    endTime: "12:00",
  };

  const updateScheduleResponse = await fetch(`${apiBaseUrl}/schedule`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(schedule),
  });

  await expectOk(updateScheduleResponse, "schedule setup");

  const createEventTypeResponse = await fetch(`${apiBaseUrl}/owner/event-types`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Стратегическая сессия",
      description: "Тестовый тип встречи для e2e.",
      durationMinutes: 60,
    }),
  });

  await expectOk(createEventTypeResponse, "event type setup");

  const eventType = (await createEventTypeResponse.json()) as EventType;

  const availabilityResponse = await fetch(
    `${apiBaseUrl}/event-types/${eventType.id}/availability`,
  );
  await expectOk(availabilityResponse, "availability setup");

  const availability = (await availabilityResponse.json()) as AvailableSlot[];

  if (availability.length === 0) {
    throw new Error("No availability returned for e2e setup.");
  }

  return {
    eventType,
    firstSlot: availability[0],
  };
}

export async function createConflictingBooking(slot: AvailableSlot, eventTypeId: string) {
  const response = await fetch(`${apiBaseUrl}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventTypeId,
      startAt: slot.startAt,
      endAt: slot.endAt,
      guestName: "Conflict Guest",
      guestEmail: "conflict@example.com",
    }),
  });

  await expectOk(response, "conflicting booking setup");

  return (await response.json()) as Booking;
}
```

- [ ] **Step 4: Replace the shells with full scenarios**

Update `tests/e2e/booking-flow.spec.ts` to prepare state through the helper and drive the UI:

```ts
import { expect, test } from "@playwright/test";

import { createConflictingBooking, prepareBookableEventType } from "./helpers/api";

async function openBookingFlow(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Бронирования" })).toBeVisible();
  await page.getByRole("button", { name: "Записаться" }).click();

  const eventTypeHeading = page.getByRole("heading", { name: "Выберите тип встречи" });
  const dateTimeHeading = page.getByRole("heading", { name: "Выберите дату и время" });

  if (await eventTypeHeading.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /Стратегическая сессия/ }).click();
    await page.getByRole("button", { name: "Далее" }).click();
  }

  await expect(dateTimeHeading).toBeVisible();
}

test.describe("guest booking flow", () => {
  test("books a slot successfully", async ({ page }) => {
    await prepareBookableEventType();
    await openBookingFlow(page);

    await page.getByRole("button", { name: /^09:00|10:00|11:00/ }).first().click();
    await page.getByRole("button", { name: "Далее" }).click();

    await expect(page.getByRole("heading", { name: "Введите контактные данные" })).toBeVisible();
    await page.getByLabel("Имя").fill("Иван Петров");
    await page.getByLabel("Email").fill("ivan@example.com");
    await page.getByRole("button", { name: /Подтвердить|Забронировать|Готово/ }).click();

    await expect(page.getByText("ivan@example.com")).toBeVisible();
    await expect(page.getByText(/Стратегическая сессия/)).toBeVisible();
  });

  test("shows a conflict when the slot becomes unavailable before submit", async ({ page }) => {
    const { eventType, firstSlot } = await prepareBookableEventType();

    await openBookingFlow(page);
    await page.getByRole("button", { name: new RegExp(firstSlot.startAt.slice(11, 16)) }).click();
    await page.getByRole("button", { name: "Далее" }).click();

    await expect(page.getByRole("heading", { name: "Введите контактные данные" })).toBeVisible();
    await createConflictingBooking(firstSlot, eventType.id);

    await page.getByLabel("Имя").fill("Анна Смирнова");
    await page.getByLabel("Email").fill("anna@example.com");
    await page.getByRole("button", { name: /Подтвердить|Забронировать|Готово/ }).click();

    await expect(page.getByRole("heading", { name: "Введите контактные данные" })).toBeVisible();
    await expect(page.getByText(/не удалось|недоступ|занят|conflict/i)).toBeVisible();
  });

  test("shows validation errors for empty and invalid contacts", async ({ page }) => {
    await prepareBookableEventType();

    await openBookingFlow(page);
    await page.getByRole("button").filter({ hasText: ":" }).first().click();
    await page.getByRole("button", { name: "Далее" }).click();

    await expect(page.getByRole("heading", { name: "Введите контактные данные" })).toBeVisible();

    await page.getByRole("button", { name: /Подтвердить|Забронировать|Готово/ }).click();
    await expect(page.getByText("Заполните имя и email, чтобы подтвердить бронирование.")).toBeVisible();

    await page.getByLabel("Имя").fill("Тестовый гость");
    await page.getByLabel("Email").fill("broken-email");
    await page.getByRole("button", { name: /Подтвердить|Забронировать|Готово/ }).click();

    await expect(page.getByText("Укажите корректный email.")).toBeVisible();
  });
});
```

Then align the exact button names and form labels with the current UI text if they differ.

- [ ] **Step 5: Run the e2e suite and fix selector mismatches**

Run:

```bash
npm run e2e:test
```

Expected: initial failures may point to exact accessible names in the UI. Adjust only selectors or small accessibility attributes until all three tests pass.

- [ ] **Step 6: Commit the e2e scenarios**

```bash
git add tests/e2e playwright.config.ts
git commit -m "Add booking flow e2e scenarios"
```

### Task 3: Add GitHub Actions Coverage

**Files:**
- Create: `.github/workflows/e2e.yml`

- [ ] **Step 1: Add the workflow**

Create `.github/workflows/e2e.yml`:

```yaml
name: e2e

on:
  push:
    branches:
      - "**"
  pull_request:

jobs:
  playwright:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm install

      - name: Install Playwright browser
        run: npm run e2e:install

      - name: Run e2e tests
        run: npm run e2e:test

      - name: Upload Playwright report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: test-results
```

- [ ] **Step 2: Verify the workflow YAML locally**

Run:

```bash
sed -n '1,220p' .github/workflows/e2e.yml
```

Expected: the workflow references only commands that exist in the repository.

- [ ] **Step 3: Commit the CI workflow**

```bash
git add .github/workflows/e2e.yml
git commit -m "Add e2e GitHub Actions workflow"
```

### Task 4: Document Local E2E Usage

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Update README with e2e commands**

Add a short section to `README.md` under the run/test commands:

```md
Запуск интеграционных e2e-тестов в браузере:

```bash
npm run e2e:install
npm run e2e:test
```
```

Also mention that the tests live in `tests/e2e/` and use Playwright against the running frontend and backend.

- [ ] **Step 2: Update AGENTS guidance**

Add the new local e2e command to the testing/build guidance in `AGENTS.md` and mention that browser integration tests live in `tests/e2e/`.

- [ ] **Step 3: Run the full local verification set**

Run:

```bash
npm run backend:test -- --run
npm run frontend:test -- --run
npm run e2e:test
```

Expected: PASS across backend, frontend, and Playwright suites.

- [ ] **Step 4: Commit the documentation updates**

```bash
git add README.md AGENTS.md
git commit -m "Document Playwright e2e workflow"
```

## Self-Review

Spec coverage:
- root Playwright setup: Task 1
- three booking scenarios: Task 2
- backend state preparation through existing API: Task 2
- CI wiring: Task 3
- documentation updates: Task 4

Placeholder scan:
- no `TODO`/`TBD` markers remain
- each task includes explicit files, commands, and concrete code skeletons

Type consistency:
- helper names and file paths are consistent across tasks
- all HTTP endpoints used in the plan exist in the current contract and implementation
