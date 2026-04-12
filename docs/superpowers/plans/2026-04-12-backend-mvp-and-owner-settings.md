# Backend MVP And Owner Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a contract-driven backend with in-memory storage, enforce booking rules on the server, and add an owner-facing frontend settings page for editing the weekly schedule.

**Architecture:** Extend the TypeSpec contract first with a global schedule resource, then implement a Fastify backend under `apps/backend/` with small domain services and in-memory repositories. Keep the frontend integration thin by adding a focused `Настройки` page that talks to `GET /schedule` and `PUT /schedule` through a dedicated API module and small validation helper.

**Tech Stack:** TypeSpec, OpenAPI, Node.js, TypeScript, Fastify, React, Vite, Vitest, Testing Library

---

## File Structure

Planned files and responsibilities:

- Modify: `spec/models.tsp` to add `DayOfWeek`, `Schedule`, and schedule request/response models
- Modify: `spec/routes.tsp` to add `GET /schedule` and `PUT /schedule`
- Modify: `tsp-output/schema/openapi.yaml` via `npm run spec:compile`
- Create: `apps/backend/package.json` for backend-local scripts and dependencies
- Create: `apps/backend/tsconfig.json` for backend TypeScript settings
- Create: `apps/backend/src/server.ts` as the backend process entry point
- Create: `apps/backend/src/app.ts` to build the Fastify app and register routes
- Create: `apps/backend/src/types.ts` for backend domain types shared across services and repositories
- Create: `apps/backend/src/lib/time.ts` for UTC date, `HH:mm`, and interval helpers
- Create: `apps/backend/src/lib/errors.ts` for domain error helpers mapped to API responses
- Create: `apps/backend/src/repositories/inMemoryEventTypeRepository.ts` for event-type storage
- Create: `apps/backend/src/repositories/inMemoryBookingRepository.ts` for booking storage
- Create: `apps/backend/src/repositories/inMemoryScheduleRepository.ts` for the single global owner schedule
- Create: `apps/backend/src/services/scheduleService.ts` for schedule validation and updates
- Create: `apps/backend/src/services/eventTypeService.ts` for create/list event-type logic
- Create: `apps/backend/src/services/bookingService.ts` for availability, booking creation, and cancellation rules
- Create: `apps/backend/src/routes/scheduleRoutes.ts` for schedule endpoints
- Create: `apps/backend/src/routes/eventTypeRoutes.ts` for event-type endpoints
- Create: `apps/backend/src/routes/bookingRoutes.ts` for booking endpoints
- Create: `apps/backend/src/app.test.ts` for backend API integration tests using Fastify inject
- Modify: `package.json` to add root scripts for backend dev/build/test
- Modify: `README.md` to document backend commands and the owner settings flow
- Modify: `AGENTS.md` to reflect the new backend app and validation commands
- Modify: `apps/frontend/src/types.ts` to add schedule and workspace types
- Create: `apps/frontend/src/lib/scheduleApi.ts` for frontend API calls
- Create: `apps/frontend/src/lib/ownerSchedule.ts` for frontend schedule validation and weekday metadata
- Create: `apps/frontend/src/lib/ownerSchedule.test.ts` for pure schedule-form logic tests
- Create: `apps/frontend/src/components/OwnerWorkspaceNav.tsx` for the shared owner/public navigation bar
- Create: `apps/frontend/src/components/OwnerSettingsPage.tsx` for the schedule UI
- Create: `apps/frontend/src/components/OwnerSettingsPage.test.tsx` for focused UI tests
- Modify: `apps/frontend/src/components/OwnerEventTypesPage.tsx` to use shared navigation and support the new settings workspace
- Modify: `apps/frontend/src/App.tsx` to route between `Бронирования`, `Типы событий`, and `Настройки`
- Modify: `apps/frontend/src/App.test.tsx` to cover navigation into the settings page
- Modify: `apps/frontend/src/styles.css` to style the new settings card, weekday toggles, and feedback states

### Task 1: Extend The TypeSpec Contract With Owner Schedule

**Files:**
- Modify: `spec/models.tsp`
- Modify: `spec/routes.tsp`
- Modify: `tsp-output/schema/openapi.yaml`

- [ ] **Step 1: Confirm the generated contract does not expose schedule endpoints yet**

Run:

```bash
rg "/schedule|Schedule" spec tsp-output/schema/openapi.yaml
```

Expected:

```text

```

No matches means the contract still does not expose `GET /schedule` or `PUT /schedule`.

- [ ] **Step 2: Add schedule models to `spec/models.tsp`**

Add these declarations after `BookingStatus`:

```typespec
enum DayOfWeek {
  monday,
  tuesday,
  wednesday,
  thursday,
  friday,
  saturday,
  sunday,
}

model Schedule {
  workingDays: DayOfWeek[];
  startTime: string;
  endTime: string;
}

model UpdateScheduleRequest {
  workingDays: DayOfWeek[];
  startTime: string;
  endTime: string;
}

model ScheduleResponse {
  @statusCode
  statusCode: 200;

  @body
  body: Schedule;
}

model UpdateScheduleResponse {
  @statusCode
  statusCode: 200;

  @body
  body: Schedule;
}
```

- [ ] **Step 3: Add schedule routes to `spec/routes.tsp`**

Add this interface before `@route("/event-types")`:

```typespec
@route("/schedule")
@tag("Schedule")
interface ScheduleResource {
  /**
   * Owner-facing operation.
   * Returns the current weekly schedule used to build availability.
   */
  @get
  get(): ScheduleResponse;

  /**
   * Owner-facing operation.
   * Replaces the weekly schedule with selected working days and one common time range.
   */
  @put
  update(@body body: UpdateScheduleRequest): UpdateScheduleResponse | BadRequestError;
}
```

- [ ] **Step 4: Rebuild the OpenAPI output**

Run:

```bash
npm run spec:compile
```

Expected:

```text
TypeSpec compiler v...
Compilation completed successfully.
```

- [ ] **Step 5: Verify the generated OpenAPI includes the new path and schema**

Run:

```bash
rg "^  /schedule:|Schedule:|DayOfWeek:" tsp-output/schema/openapi.yaml
```

Expected:

```text
  /schedule:
    Schedule:
    DayOfWeek:
```

- [ ] **Step 6: Commit**

```bash
git add spec/models.tsp spec/routes.tsp tsp-output/schema/openapi.yaml
git commit -m "feat: add owner schedule contract"
```

### Task 2: Scaffold The Backend App And Default Schedule Endpoint

**Files:**
- Create: `apps/backend/package.json`
- Create: `apps/backend/tsconfig.json`
- Create: `apps/backend/src/server.ts`
- Create: `apps/backend/src/app.ts`
- Create: `apps/backend/src/types.ts`
- Create: `apps/backend/src/repositories/inMemoryScheduleRepository.ts`
- Create: `apps/backend/src/services/scheduleService.ts`
- Create: `apps/backend/src/routes/scheduleRoutes.ts`
- Create: `apps/backend/src/app.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing backend smoke test**

Create `apps/backend/src/app.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";

import { createApp } from "./app";

describe("schedule routes", () => {
  afterEach(async () => {
    // test-local cleanup happens per app instance
  });

  it("returns the default owner schedule", async () => {
    const app = createApp();

    const response = await app.inject({ method: "GET", url: "/schedule" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      startTime: "09:00",
      endTime: "18:00",
    });

    await app.close();
  });
});
```

- [ ] **Step 2: Run the backend test to verify it fails**

Run:

```bash
npm --prefix apps/backend test -- --run
```

Expected:

```text
npm ERR! enoent Could not read package.json
```

- [ ] **Step 3: Add the backend package, scripts, and app scaffold**

Create `apps/backend/package.json`:

```json
{
  "name": "@callplanner/backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc --noEmit",
    "test": "vitest"
  },
  "dependencies": {
    "fastify": "^5.2.1"
  },
  "devDependencies": {
    "@types/node": "^22.15.3",
    "tsx": "^4.19.3",
    "typescript": "^5.8.3",
    "vitest": "^3.1.2"
  }
}
```

Create `apps/backend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/**/*.ts"]
}
```

Create `apps/backend/src/types.ts`:

```ts
export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type OwnerSchedule = {
  workingDays: DayOfWeek[];
  startTime: string;
  endTime: string;
};

export const defaultSchedule: OwnerSchedule = {
  workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  startTime: "09:00",
  endTime: "18:00",
};
```

Create `apps/backend/src/repositories/inMemoryScheduleRepository.ts`:

```ts
import { defaultSchedule, type OwnerSchedule } from "../types";

export class InMemoryScheduleRepository {
  private schedule: OwnerSchedule = defaultSchedule;

  get(): OwnerSchedule {
    return this.schedule;
  }

  save(schedule: OwnerSchedule): OwnerSchedule {
    this.schedule = schedule;
    return this.schedule;
  }
}
```

Create `apps/backend/src/services/scheduleService.ts`:

```ts
import { InMemoryScheduleRepository } from "../repositories/inMemoryScheduleRepository";

export class ScheduleService {
  constructor(private readonly repository: InMemoryScheduleRepository) {}

  getSchedule() {
    return this.repository.get();
  }
}
```

Create `apps/backend/src/routes/scheduleRoutes.ts`:

```ts
import type { FastifyInstance } from "fastify";

import { ScheduleService } from "../services/scheduleService";

export function registerScheduleRoutes(app: FastifyInstance, scheduleService: ScheduleService) {
  app.get("/schedule", async () => scheduleService.getSchedule());
}
```

Create `apps/backend/src/app.ts`:

```ts
import Fastify from "fastify";

import { InMemoryScheduleRepository } from "./repositories/inMemoryScheduleRepository";
import { registerScheduleRoutes } from "./routes/scheduleRoutes";
import { ScheduleService } from "./services/scheduleService";

export function createApp() {
  const app = Fastify({ logger: false });
  const scheduleRepository = new InMemoryScheduleRepository();
  const scheduleService = new ScheduleService(scheduleRepository);

  registerScheduleRoutes(app, scheduleService);

  return app;
}
```

Create `apps/backend/src/server.ts`:

```ts
import { createApp } from "./app";

const port = Number(process.env.PORT ?? 3001);
const app = createApp();

app.listen({ port, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
```

Modify the root `package.json` scripts section:

```json
{
  "scripts": {
    "spec:compile": "tsp compile spec",
    "spec:format": "tsp format \"spec/**/*.tsp\"",
    "frontend:dev": "npm --prefix apps/frontend run dev",
    "frontend:build": "npm --prefix apps/frontend run build",
    "frontend:test": "npm --prefix apps/frontend run test --",
    "backend:dev": "npm --prefix apps/backend run dev",
    "backend:build": "npm --prefix apps/backend run build",
    "backend:test": "npm --prefix apps/backend run test --"
  }
}
```

- [ ] **Step 4: Install backend dependencies**

Run:

```bash
npm install --prefix apps/backend
```

Expected:

```text
added ... packages
found 0 vulnerabilities
```

- [ ] **Step 5: Run the smoke test to verify the default schedule endpoint passes**

Run:

```bash
npm run backend:test -- --run apps/backend/src/app.test.ts
```

Expected:

```text
✓ apps/backend/src/app.test.ts (...)
```

- [ ] **Step 6: Commit**

```bash
git add package.json apps/backend/package.json apps/backend/tsconfig.json apps/backend/src
git commit -m "feat: scaffold backend app with schedule endpoint"
```

### Task 3: Implement Schedule Validation And Event-Type Endpoints

**Files:**
- Modify: `apps/backend/src/app.test.ts`
- Create: `apps/backend/src/lib/time.ts`
- Create: `apps/backend/src/lib/errors.ts`
- Create: `apps/backend/src/repositories/inMemoryEventTypeRepository.ts`
- Create: `apps/backend/src/services/eventTypeService.ts`
- Modify: `apps/backend/src/services/scheduleService.ts`
- Modify: `apps/backend/src/routes/scheduleRoutes.ts`
- Create: `apps/backend/src/routes/eventTypeRoutes.ts`
- Modify: `apps/backend/src/app.ts`
- Modify: `apps/backend/src/types.ts`

- [ ] **Step 1: Add failing tests for invalid schedule updates and event-type CRUD**

Append these tests to `apps/backend/src/app.test.ts`:

```ts
it("rejects schedule updates without working days", async () => {
  const app = createApp();

  const response = await app.inject({
    method: "PUT",
    url: "/schedule",
    payload: { workingDays: [], startTime: "09:00", endTime: "18:00" },
  });

  expect(response.statusCode).toBe(400);
  expect(response.json()).toEqual({
    code: "bad_request",
    message: "Укажите хотя бы один рабочий день.",
  });

  await app.close();
});

it("updates the owner schedule when the payload is valid", async () => {
  const app = createApp();

  const response = await app.inject({
    method: "PUT",
    url: "/schedule",
    payload: {
      workingDays: ["monday", "wednesday", "friday"],
      startTime: "10:00",
      endTime: "16:00",
    },
  });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({
    workingDays: ["monday", "wednesday", "friday"],
    startTime: "10:00",
    endTime: "16:00",
  });

  await app.close();
});

it("creates and lists event types", async () => {
  const app = createApp();

  const createResponse = await app.inject({
    method: "POST",
    url: "/event-types",
    payload: {
      title: "Стратегическая сессия",
      description: "Разбор целей и следующих шагов.",
      durationMinutes: 60,
    },
  });

  expect(createResponse.statusCode).toBe(201);

  const listResponse = await app.inject({ method: "GET", url: "/event-types" });

  expect(listResponse.statusCode).toBe(200);
  expect(listResponse.json()).toEqual([
    expect.objectContaining({
      title: "Стратегическая сессия",
      description: "Разбор целей и следующих шагов.",
      durationMinutes: 60,
    }),
  ]);

  await app.close();
});

it("rejects event types with non-positive duration", async () => {
  const app = createApp();

  const response = await app.inject({
    method: "POST",
    url: "/event-types",
    payload: {
      title: "Ошибка",
      description: "Некорректная длительность.",
      durationMinutes: 0,
    },
  });

  expect(response.statusCode).toBe(400);
  expect(response.json()).toEqual({
    code: "bad_request",
    message: "durationMinutes must be a positive integer.",
  });

  await app.close();
});
```

- [ ] **Step 2: Run the backend tests to verify the new cases fail**

Run:

```bash
npm run backend:test -- --run apps/backend/src/app.test.ts
```

Expected:

```text
FAIL  apps/backend/src/app.test.ts
Route PUT:/schedule not found
Route POST:/event-types not found
```

- [ ] **Step 3: Add time parsing, error helpers, schedule validation, and event-type storage**

Create `apps/backend/src/lib/errors.ts`:

```ts
export class AppError extends Error {
  constructor(
    public readonly statusCode: 400 | 404 | 409,
    public readonly code: "bad_request" | "not_found" | "conflict",
    message: string,
  ) {
    super(message);
  }
}
```

Create `apps/backend/src/lib/time.ts`:

```ts
const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseTime(value: string): number | null {
  const match = timePattern.exec(value);

  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

export function isValidTimeRange(startTime: string, endTime: string): boolean {
  const startMinutes = parseTime(startTime);
  const endMinutes = parseTime(endTime);

  return startMinutes !== null && endMinutes !== null && startMinutes < endMinutes;
}
```

Extend `apps/backend/src/types.ts` with event-type shapes:

```ts
export type EventType = {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
};

export type CreateEventTypeInput = {
  title: string;
  description?: string;
  durationMinutes: number;
};
```

Create `apps/backend/src/repositories/inMemoryEventTypeRepository.ts`:

```ts
import type { EventType } from "../types";

export class InMemoryEventTypeRepository {
  private readonly items = new Map<string, EventType>();

  list(): EventType[] {
    return [...this.items.values()];
  }

  get(id: string): EventType | null {
    return this.items.get(id) ?? null;
  }

  save(eventType: EventType): EventType {
    this.items.set(eventType.id, eventType);
    return eventType;
  }
}
```

Create `apps/backend/src/services/eventTypeService.ts`:

```ts
import { randomUUID } from "node:crypto";

import { AppError } from "../lib/errors";
import { InMemoryEventTypeRepository } from "../repositories/inMemoryEventTypeRepository";
import type { CreateEventTypeInput } from "../types";

export class EventTypeService {
  constructor(private readonly repository: InMemoryEventTypeRepository) {}

  listEventTypes() {
    return this.repository.list();
  }

  createEventType(input: CreateEventTypeInput) {
    if (!Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0) {
      throw new AppError(400, "bad_request", "durationMinutes must be a positive integer.");
    }

    return this.repository.save({
      id: randomUUID(),
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      durationMinutes: input.durationMinutes,
    });
  }
}
```

Update `apps/backend/src/services/scheduleService.ts`:

```ts
import { AppError } from "../lib/errors";
import { isValidTimeRange } from "../lib/time";
import { InMemoryScheduleRepository } from "../repositories/inMemoryScheduleRepository";
import type { OwnerSchedule } from "../types";

export class ScheduleService {
  constructor(private readonly repository: InMemoryScheduleRepository) {}

  getSchedule() {
    return this.repository.get();
  }

  updateSchedule(input: OwnerSchedule) {
    if (input.workingDays.length === 0) {
      throw new AppError(400, "bad_request", "Укажите хотя бы один рабочий день.");
    }

    if (!isValidTimeRange(input.startTime, input.endTime)) {
      throw new AppError(400, "bad_request", "Укажите корректный диапазон рабочего времени.");
    }

    return this.repository.save(input);
  }
}
```

Create `apps/backend/src/routes/eventTypeRoutes.ts`:

```ts
import type { FastifyInstance } from "fastify";

import { AppError } from "../lib/errors";
import { EventTypeService } from "../services/eventTypeService";

export function registerEventTypeRoutes(app: FastifyInstance, eventTypeService: EventTypeService) {
  app.get("/event-types", async () => eventTypeService.listEventTypes());

  app.post("/event-types", async (request, reply) => {
    try {
      const created = eventTypeService.createEventType(request.body as never);
      return reply.code(201).send(created);
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send({ code: error.code, message: error.message });
      }

      throw error;
    }
  });
}
```

Update `apps/backend/src/routes/scheduleRoutes.ts`:

```ts
import type { FastifyInstance } from "fastify";

import { AppError } from "../lib/errors";
import { ScheduleService } from "../services/scheduleService";

export function registerScheduleRoutes(app: FastifyInstance, scheduleService: ScheduleService) {
  app.get("/schedule", async () => scheduleService.getSchedule());

  app.put("/schedule", async (request, reply) => {
    try {
      return scheduleService.updateSchedule(request.body as never);
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send({ code: error.code, message: error.message });
      }

      throw error;
    }
  });
}
```

Update `apps/backend/src/app.ts` to wire the schedule and event-type repositories and routes:

```ts
import Fastify from "fastify";

import { InMemoryEventTypeRepository } from "./repositories/inMemoryEventTypeRepository";
import { InMemoryScheduleRepository } from "./repositories/inMemoryScheduleRepository";
import { registerEventTypeRoutes } from "./routes/eventTypeRoutes";
import { registerScheduleRoutes } from "./routes/scheduleRoutes";
import { EventTypeService } from "./services/eventTypeService";
import { ScheduleService } from "./services/scheduleService";

export function createApp() {
  const app = Fastify({ logger: false });
  const scheduleRepository = new InMemoryScheduleRepository();
  const eventTypeRepository = new InMemoryEventTypeRepository();
  const scheduleService = new ScheduleService(scheduleRepository);
  const eventTypeService = new EventTypeService(eventTypeRepository);

  registerScheduleRoutes(app, scheduleService);
  registerEventTypeRoutes(app, eventTypeService);

  return app;
}
```

- [ ] **Step 4: Run the backend tests to verify schedule and event-type endpoints pass**

Run:

```bash
npm run backend:test -- --run apps/backend/src/app.test.ts
```

Expected:

```text
✓ apps/backend/src/app.test.ts (...)
```

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src apps/backend/package.json apps/backend/tsconfig.json package.json
git commit -m "feat: add schedule validation and event type endpoints"
```

### Task 4: Implement Availability, Booking Creation, And Cancellation Rules

**Files:**
- Modify: `apps/backend/src/app.test.ts`
- Modify: `apps/backend/src/types.ts`
- Create: `apps/backend/src/repositories/inMemoryBookingRepository.ts`
- Create: `apps/backend/src/services/bookingService.ts`
- Create: `apps/backend/src/routes/bookingRoutes.ts`
- Modify: `apps/backend/src/lib/time.ts`
- Modify: `apps/backend/src/app.ts`

- [ ] **Step 1: Add failing integration tests for availability, conflict handling, and cancellation**

Append these tests to `apps/backend/src/app.test.ts`:

```ts
it("returns only free slots that match the event type duration", async () => {
  const app = createApp();

  const createResponse = await app.inject({
    method: "POST",
    url: "/event-types",
    payload: {
      title: "Короткий созвон",
      description: "Быстрый слот.",
      durationMinutes: 30,
    },
  });

  const eventTypeId = createResponse.json().id as string;

  await app.inject({
    method: "PUT",
    url: "/schedule",
    payload: {
      workingDays: ["monday"],
      startTime: "09:00",
      endTime: "10:00",
    },
  });

  const availabilityResponse = await app.inject({
    method: "GET",
    url: `/event-types/${eventTypeId}/availability`,
  });

  expect(availabilityResponse.statusCode).toBe(200);
  expect(availabilityResponse.json()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ startAt: expect.any(String), endAt: expect.any(String) }),
    ]),
  );

  await app.close();
});

it("rejects booking an already occupied interval with 409", async () => {
  const app = createApp();

  const createResponse = await app.inject({
    method: "POST",
    url: "/event-types",
    payload: {
      title: "Стратегическая сессия",
      description: "Разбор целей.",
      durationMinutes: 60,
    },
  });

  const eventTypeId = createResponse.json().id as string;
  const nextMonday = new Date("2026-04-13T10:00:00Z");

  await app.inject({
    method: "PUT",
    url: "/schedule",
    payload: {
      workingDays: ["monday"],
      startTime: "09:00",
      endTime: "18:00",
    },
  });

  const firstResponse = await app.inject({
    method: "POST",
    url: "/bookings",
    payload: {
      eventTypeId,
      startAt: nextMonday.toISOString(),
      endAt: new Date(nextMonday.getTime() + 60 * 60 * 1000).toISOString(),
      guestName: "Иван",
      guestEmail: "ivan@example.com",
    },
  });

  expect(firstResponse.statusCode).toBe(201);

  const secondResponse = await app.inject({
    method: "POST",
    url: "/bookings",
    payload: {
      eventTypeId,
      startAt: nextMonday.toISOString(),
      endAt: new Date(nextMonday.getTime() + 60 * 60 * 1000).toISOString(),
      guestName: "Мария",
      guestEmail: "maria@example.com",
    },
  });

  expect(secondResponse.statusCode).toBe(409);
  expect(secondResponse.json()).toEqual({
    code: "conflict",
    message: "The selected slot is no longer available.",
  });

  await app.close();
});

it("makes a slot available again after cancellation", async () => {
  const app = createApp();

  const createResponse = await app.inject({
    method: "POST",
    url: "/event-types",
    payload: {
      title: "Короткий созвон",
      description: "Быстрый слот.",
      durationMinutes: 30,
    },
  });

  const eventTypeId = createResponse.json().id as string;
  const startAt = "2026-04-13T09:00:00.000Z";
  const endAt = "2026-04-13T09:30:00.000Z";

  await app.inject({
    method: "PUT",
    url: "/schedule",
    payload: {
      workingDays: ["monday"],
      startTime: "09:00",
      endTime: "10:00",
    },
  });

  const bookingResponse = await app.inject({
    method: "POST",
    url: "/bookings",
    payload: {
      eventTypeId,
      startAt,
      endAt,
      guestName: "Иван",
      guestEmail: "ivan@example.com",
    },
  });

  const bookingId = bookingResponse.json().id as string;

  const cancelResponse = await app.inject({
    method: "POST",
    url: `/bookings/${bookingId}:cancel`,
  });

  expect(cancelResponse.statusCode).toBe(200);
  expect(cancelResponse.json()).toMatchObject({ status: "cancelled" });

  const availabilityResponse = await app.inject({
    method: "GET",
    url: `/event-types/${eventTypeId}/availability`,
  });

  expect(availabilityResponse.json()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ startAt, endAt }),
    ]),
  );

  await app.close();
});
```

- [ ] **Step 2: Run the backend tests to verify booking routes are still missing**

Run:

```bash
npm run backend:test -- --run apps/backend/src/app.test.ts
```

Expected:

```text
FAIL  apps/backend/src/app.test.ts
Route GET:/event-types/.../availability not found
Route POST:/bookings not found
```

- [ ] **Step 3: Add booking types, repository, time helpers, and booking service**

Extend `apps/backend/src/types.ts`:

```ts
export type BookingStatus = "active" | "cancelled";

export type Booking = {
  id: string;
  eventTypeId: string;
  startAt: string;
  endAt: string;
  guestName: string;
  guestEmail: string;
  status: BookingStatus;
};

export type CreateBookingInput = {
  eventTypeId: string;
  startAt: string;
  endAt: string;
  guestName: string;
  guestEmail: string;
};
```

Append these helpers to `apps/backend/src/lib/time.ts`:

```ts
const weekdayNames = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export function getDayOfWeek(date: Date) {
  return weekdayNames[date.getUTCDay()];
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function differenceInMinutes(startAt: Date, endAt: Date) {
  return (endAt.getTime() - startAt.getTime()) / (60 * 1000);
}

export function isWithinNext14Days(date: Date, now: Date) {
  const upperBound = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  return date >= now && date <= upperBound;
}

export function setUtcTime(date: Date, time: string) {
  const minutes = parseTime(time);

  if (minutes === null) {
    throw new Error("invalid time");
  }

  const result = new Date(date);
  result.setUTCHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return result;
}
```

Create `apps/backend/src/repositories/inMemoryBookingRepository.ts`:

```ts
import type { Booking } from "../types";

export class InMemoryBookingRepository {
  private readonly items = new Map<string, Booking>();

  list(): Booking[] {
    return [...this.items.values()];
  }

  get(id: string): Booking | null {
    return this.items.get(id) ?? null;
  }

  save(booking: Booking): Booking {
    this.items.set(booking.id, booking);
    return booking;
  }
}
```

Create `apps/backend/src/services/bookingService.ts`:

```ts
import { randomUUID } from "node:crypto";

import { addMinutes, differenceInMinutes, getDayOfWeek, isWithinNext14Days, setUtcTime } from "../lib/time";
import { AppError } from "../lib/errors";
import { InMemoryBookingRepository } from "../repositories/inMemoryBookingRepository";
import { InMemoryEventTypeRepository } from "../repositories/inMemoryEventTypeRepository";
import { InMemoryScheduleRepository } from "../repositories/inMemoryScheduleRepository";
import type { Booking, CreateBookingInput } from "../types";

export class BookingService {
  constructor(
    private readonly eventTypeRepository: InMemoryEventTypeRepository,
    private readonly bookingRepository: InMemoryBookingRepository,
    private readonly scheduleRepository: InMemoryScheduleRepository,
  ) {}

  listBookings() {
    return this.bookingRepository.list();
  }

  getAvailability(eventTypeId: string, now = new Date()) {
    const eventType = this.eventTypeRepository.get(eventTypeId);

    if (!eventType) {
      throw new AppError(404, "not_found", "Event type not found.");
    }

    const schedule = this.scheduleRepository.get();
    const activeBookings = this.bookingRepository.list().filter((booking) => booking.status === "active");
    const slots: Array<{ startAt: string; endAt: string }> = [];

    for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
      const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset));
      const weekday = getDayOfWeek(day);

      if (!schedule.workingDays.includes(weekday)) {
        continue;
      }

      let cursor = setUtcTime(day, schedule.startTime);
      const finish = setUtcTime(day, schedule.endTime);

      while (addMinutes(cursor, eventType.durationMinutes) <= finish) {
        const nextEnd = addMinutes(cursor, eventType.durationMinutes);
        const startAt = cursor.toISOString();
        const endAt = nextEnd.toISOString();
        const isBooked = activeBookings.some(
          (booking) => booking.startAt === startAt && booking.endAt === endAt,
        );

        if (!isBooked && cursor >= now) {
          slots.push({ startAt, endAt });
        }

        cursor = nextEnd;
      }
    }

    return slots;
  }

  createBooking(input: CreateBookingInput, now = new Date()) {
    const eventType = this.eventTypeRepository.get(input.eventTypeId);

    if (!eventType) {
      throw new AppError(404, "not_found", "Event type not found.");
    }

    const startAt = new Date(input.startAt);
    const endAt = new Date(input.endAt);

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new AppError(400, "bad_request", "Invalid booking timestamps.");
    }

    if (startAt >= endAt || differenceInMinutes(startAt, endAt) !== eventType.durationMinutes) {
      throw new AppError(409, "conflict", "The selected slot does not match the event duration.");
    }

    if (!isWithinNext14Days(startAt, now)) {
      throw new AppError(409, "conflict", "The selected slot is outside the 14-day booking window.");
    }

    const schedule = this.scheduleRepository.get();
    const weekday = getDayOfWeek(startAt);
    const scheduleStart = setUtcTime(startAt, schedule.startTime);
    const scheduleEnd = setUtcTime(startAt, schedule.endTime);

    if (!schedule.workingDays.includes(weekday) || startAt < scheduleStart || endAt > scheduleEnd) {
      throw new AppError(409, "conflict", "The selected slot is outside the owner schedule.");
    }

    const hasConflict = this.bookingRepository
      .list()
      .some((booking) => booking.status === "active" && booking.startAt === input.startAt && booking.endAt === input.endAt);

    if (hasConflict) {
      throw new AppError(409, "conflict", "The selected slot is no longer available.");
    }

    return this.bookingRepository.save({
      id: randomUUID(),
      eventTypeId: input.eventTypeId,
      startAt: input.startAt,
      endAt: input.endAt,
      guestName: input.guestName.trim(),
      guestEmail: input.guestEmail.trim(),
      status: "active",
    });
  }

  cancelBooking(bookingId: string): Booking {
    const booking = this.bookingRepository.get(bookingId);

    if (!booking) {
      throw new AppError(404, "not_found", "Booking not found.");
    }

    if (booking.status === "cancelled") {
      throw new AppError(409, "conflict", "Booking is already cancelled.");
    }

    return this.bookingRepository.save({ ...booking, status: "cancelled" });
  }
}
```

Create `apps/backend/src/routes/bookingRoutes.ts`:

```ts
import type { FastifyInstance } from "fastify";

import { AppError } from "../lib/errors";
import { BookingService } from "../services/bookingService";

export function registerBookingRoutes(app: FastifyInstance, bookingService: BookingService) {
  app.get("/event-types/:eventTypeId/availability", async (request, reply) => {
    try {
      return bookingService.getAvailability((request.params as { eventTypeId: string }).eventTypeId);
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send({ code: error.code, message: error.message });
      }

      throw error;
    }
  });

  app.get("/bookings", async () => bookingService.listBookings());

  app.post("/bookings", async (request, reply) => {
    try {
      const created = bookingService.createBooking(request.body as never);
      return reply.code(201).send(created);
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send({ code: error.code, message: error.message });
      }

      throw error;
    }
  });

  app.post("/bookings/:bookingId:cancel", async (request, reply) => {
    try {
      return bookingService.cancelBooking((request.params as { bookingId: string }).bookingId);
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send({ code: error.code, message: error.message });
      }

      throw error;
    }
  });
}
```

- [ ] **Step 4: Run the backend tests to verify booking rules pass**

Run:

```bash
npm run backend:test -- --run apps/backend/src/app.test.ts
```

Expected:

```text
✓ apps/backend/src/app.test.ts (...)
```

- [ ] **Step 5: Run the backend typecheck**

Run:

```bash
npm run backend:build
```

Expected:

```text

```

No output means TypeScript accepted the backend files.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src
git commit -m "feat: implement booking and availability rules"
```

### Task 5: Add The Owner Settings Frontend Flow

**Files:**
- Modify: `apps/frontend/src/types.ts`
- Create: `apps/frontend/src/lib/scheduleApi.ts`
- Create: `apps/frontend/src/lib/ownerSchedule.ts`
- Create: `apps/frontend/src/lib/ownerSchedule.test.ts`
- Create: `apps/frontend/src/components/OwnerWorkspaceNav.tsx`
- Create: `apps/frontend/src/components/OwnerSettingsPage.tsx`
- Create: `apps/frontend/src/components/OwnerSettingsPage.test.tsx`
- Modify: `apps/frontend/src/components/OwnerEventTypesPage.tsx`
- Modify: `apps/frontend/src/App.tsx`
- Modify: `apps/frontend/src/App.test.tsx`
- Modify: `apps/frontend/src/styles.css`

- [ ] **Step 1: Write the failing frontend tests for validation and navigation**

Create `apps/frontend/src/lib/ownerSchedule.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { validateOwnerScheduleForm } from "./ownerSchedule";

describe("validateOwnerScheduleForm", () => {
  it("requires at least one weekday", () => {
    expect(
      validateOwnerScheduleForm({ workingDays: [], startTime: "09:00", endTime: "18:00" }),
    ).toBe("Выберите хотя бы один рабочий день.");
  });

  it("requires the start time to be earlier than the end time", () => {
    expect(
      validateOwnerScheduleForm({
        workingDays: ["monday"],
        startTime: "18:00",
        endTime: "09:00",
      }),
    ).toBe("Время начала должно быть раньше времени окончания.");
  });
});
```

Create `apps/frontend/src/components/OwnerSettingsPage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OwnerSettingsPage } from "./OwnerSettingsPage";

vi.mock("../lib/scheduleApi", () => ({
  getSchedule: vi.fn().mockResolvedValue({
    workingDays: ["monday", "wednesday"],
    startTime: "10:00",
    endTime: "16:00",
  }),
  updateSchedule: vi.fn().mockResolvedValue({
    workingDays: ["monday", "wednesday", "friday"],
    startTime: "09:00",
    endTime: "15:00",
  }),
}));

describe("OwnerSettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads and displays the saved schedule", async () => {
    render(<OwnerSettingsPage workspace="owner-settings" onChangeWorkspace={() => {}} />);

    expect(await screen.findByRole("heading", { name: "Рабочее расписание" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Пн" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Начало")).toHaveValue("10:00");
    expect(screen.getByLabelText("Конец")).toHaveValue("16:00");
  });

  it("shows inline validation before submit", async () => {
    const user = userEvent.setup();

    render(<OwnerSettingsPage workspace="owner-settings" onChangeWorkspace={() => {}} />);

    await screen.findByRole("heading", { name: "Рабочее расписание" });
    await user.click(screen.getByRole("button", { name: "Пн" }));
    await user.click(screen.getByRole("button", { name: "Ср" }));
    await user.click(screen.getByRole("button", { name: "Сохранить расписание" }));

    expect(screen.getByText("Выберите хотя бы один рабочий день.")).toBeInTheDocument();
  });
});
```

Append this test to `apps/frontend/src/App.test.tsx`:

```tsx
it("opens the owner settings page from the top navigation", async () => {
  const user = userEvent.setup();

  render(<App scenario="public" />);

  await user.click(screen.getByRole("button", { name: "Типы событий" }));
  await user.click(screen.getByRole("button", { name: "Настройки" }));

  expect(screen.getByRole("heading", { name: "Рабочее расписание" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the frontend tests to verify the new files fail**

Run:

```bash
npm run frontend:test -- --run apps/frontend/src/lib/ownerSchedule.test.ts apps/frontend/src/components/OwnerSettingsPage.test.tsx apps/frontend/src/App.test.tsx
```

Expected:

```text
FAIL  apps/frontend/src/lib/ownerSchedule.test.ts
Cannot find module './ownerSchedule'
FAIL  apps/frontend/src/components/OwnerSettingsPage.test.tsx
Cannot find module './OwnerSettingsPage'
```

- [ ] **Step 3: Add schedule types, validation helpers, API client, and owner settings UI**

Append these types to `apps/frontend/src/types.ts`:

```ts
export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type OwnerSchedule = {
  workingDays: DayOfWeek[];
  startTime: string;
  endTime: string;
};

export type Workspace = "public" | "owner-event-types" | "owner-settings";
```

Create `apps/frontend/src/lib/ownerSchedule.ts`:

```ts
import type { DayOfWeek, OwnerSchedule } from "../types";

export const weekdayOptions: Array<{ value: DayOfWeek; label: string }> = [
  { value: "monday", label: "Пн" },
  { value: "tuesday", label: "Вт" },
  { value: "wednesday", label: "Ср" },
  { value: "thursday", label: "Чт" },
  { value: "friday", label: "Пт" },
  { value: "saturday", label: "Сб" },
  { value: "sunday", label: "Вс" },
];

export function toggleWorkingDay(workingDays: DayOfWeek[], day: DayOfWeek): DayOfWeek[] {
  return workingDays.includes(day)
    ? workingDays.filter((item) => item !== day)
    : [...workingDays, day];
}

export function validateOwnerScheduleForm(schedule: OwnerSchedule): string {
  if (schedule.workingDays.length === 0) {
    return "Выберите хотя бы один рабочий день.";
  }

  if (!schedule.startTime || !schedule.endTime) {
    return "Укажите время начала и окончания.";
  }

  if (schedule.startTime >= schedule.endTime) {
    return "Время начала должно быть раньше времени окончания.";
  }

  return "";
}
```

Create `apps/frontend/src/lib/scheduleApi.ts`:

```ts
import type { OwnerSchedule } from "../types";

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

export async function getSchedule(): Promise<OwnerSchedule> {
  const response = await fetch(`${baseUrl}/schedule`);

  if (!response.ok) {
    throw new Error("Не удалось загрузить расписание.");
  }

  return response.json();
}

export async function updateSchedule(payload: OwnerSchedule): Promise<OwnerSchedule> {
  const response = await fetch(`${baseUrl}/schedule`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message ?? "Не удалось сохранить расписание.");
  }

  return response.json();
}
```

Create `apps/frontend/src/components/OwnerWorkspaceNav.tsx`:

```tsx
import type { Workspace } from "../types";

type OwnerWorkspaceNavProps = {
  workspace: Workspace;
  onChangeWorkspace: (workspace: Workspace) => void;
};

export function OwnerWorkspaceNav({ workspace, onChangeWorkspace }: OwnerWorkspaceNavProps) {
  return (
    <nav className="workspace-nav workspace-nav--embedded" aria-label="Разделы приложения">
      <button
        type="button"
        className={`workspace-nav__link${workspace === "public" ? " workspace-nav__link--active" : ""}`}
        aria-pressed={workspace === "public"}
        onClick={() => onChangeWorkspace("public")}
      >
        Бронирования
      </button>
      <button
        type="button"
        className={`workspace-nav__link${workspace === "owner-event-types" ? " workspace-nav__link--active" : ""}`}
        aria-pressed={workspace === "owner-event-types"}
        onClick={() => onChangeWorkspace("owner-event-types")}
      >
        Типы событий
      </button>
      <button
        type="button"
        className={`workspace-nav__link${workspace === "owner-settings" ? " workspace-nav__link--active" : ""}`}
        aria-pressed={workspace === "owner-settings"}
        onClick={() => onChangeWorkspace("owner-settings")}
      >
        Настройки
      </button>
    </nav>
  );
}
```

Create `apps/frontend/src/components/OwnerSettingsPage.tsx`:

```tsx
import { useEffect, useState } from "react";

import { getSchedule, updateSchedule } from "../lib/scheduleApi";
import { toggleWorkingDay, validateOwnerScheduleForm, weekdayOptions } from "../lib/ownerSchedule";
import type { OwnerSchedule, Workspace } from "../types";
import { OwnerWorkspaceNav } from "./OwnerWorkspaceNav";

type OwnerSettingsPageProps = {
  workspace: Workspace;
  onChangeWorkspace: (workspace: Workspace) => void;
};

const emptySchedule: OwnerSchedule = {
  workingDays: [],
  startTime: "09:00",
  endTime: "18:00",
};

export function OwnerSettingsPage({ workspace, onChangeWorkspace }: OwnerSettingsPageProps) {
  const [form, setForm] = useState<OwnerSchedule>(emptySchedule);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSchedule()
      .then((schedule) => setForm(schedule))
      .catch((loadError: Error) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    const validationError = validateOwnerScheduleForm(form);

    if (validationError) {
      setError(validationError);
      setFeedback("");
      return;
    }

    try {
      const saved = await updateSchedule(form);
      setForm(saved);
      setError("");
      setFeedback("Расписание сохранено.");
    } catch (saveError) {
      setError((saveError as Error).message);
      setFeedback("");
    }
  };

  return (
    <section className="settings-page">
      <header className="owner-hero">
        <div className="hero-header">
          <div>
            <p className="eyebrow">Owner Workspace</p>
            <h1>Рабочее расписание</h1>
            <p className="panel-copy owner-hero__copy">
              Выберите дни недели и общий интервал времени. Из этих настроек сервер строит доступные слоты на ближайшие 14 дней.
            </p>
          </div>
          <OwnerWorkspaceNav workspace={workspace} onChangeWorkspace={onChangeWorkspace} />
        </div>
      </header>

      <article className="settings-card">
        <h2>Рабочее расписание</h2>
        {loading ? <p>Загружаем текущее расписание...</p> : null}
        <div className="weekday-grid" aria-label="Рабочие дни недели">
          {weekdayOptions.map((option) => {
            const selected = form.workingDays.includes(option.value);

            return (
              <button
                key={option.value}
                type="button"
                className={`weekday-toggle${selected ? " weekday-toggle--selected" : ""}`}
                aria-pressed={selected}
                onClick={() => {
                  setForm((current) => ({
                    ...current,
                    workingDays: toggleWorkingDay(current.workingDays, option.value),
                  }));
                  setError("");
                  setFeedback("");
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="settings-time-grid">
          <label className="field">
            <span>Начало</span>
            <input
              type="time"
              aria-label="Начало"
              value={form.startTime}
              onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Конец</span>
            <input
              type="time"
              aria-label="Конец"
              value={form.endTime}
              onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))}
            />
          </label>
        </div>

        {error ? <p className="form-message form-message--error">{error}</p> : null}
        {feedback ? <p className="form-message form-message--success">{feedback}</p> : null}

        <button type="button" className="primary-button" onClick={handleSave}>
          Сохранить расписание
        </button>
      </article>
    </section>
  );
}
```

Update `apps/frontend/src/App.tsx` so the workspace can switch between three screens:

```tsx
import { OwnerSettingsPage } from "./components/OwnerSettingsPage";
import type { Booking, EventType, ScheduleDay, Workspace } from "./types";

// replace useState<"public" | "owner"> with:
const [workspace, setWorkspace] = useState<Workspace>("public");

const handleWorkspaceChange = (nextWorkspace: Workspace) => {
  setWorkspace(nextWorkspace);
};

const workspaceContent =
  workspace === "public" ? (
    screen === "home" ? (
      <PublicBookingsHome
        bookings={bookings}
        eventTypes={scenarioData.eventTypes}
        initialSelectedDate={selectedHomeDate}
        schedule={scenarioData.schedule}
        workspace={workspace}
        onChangeWorkspace={handleWorkspaceChange}
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
        successActionLabel={successDestination === "home" ? "Вернуться к бронированиям" : undefined}
        onBookingSubmit={(draft) => {
          setBookings((currentBookings) => [...currentBookings, createMockBooking(scenarioData.eventTypes, draft)]);
        }}
        onSuccessAction={
          successDestination === "home"
            ? () => {
                setScreen("home");
              }
            : undefined
        }
      />
    )
  ) : workspace === "owner-event-types" ? (
    <OwnerEventTypesPage
      key={scenario}
      initialEventTypes={mockOwnerEventTypes}
      workspace={workspace}
      onChangeWorkspace={handleWorkspaceChange}
    />
  ) : (
    <OwnerSettingsPage workspace={workspace} onChangeWorkspace={handleWorkspaceChange} />
  );

return (
  <main className="app-shell app-shell--top">
    <div className="workspace-shell">
      <div className={`workspace-content${workspace === "public" && screen === "booking" ? " workspace-content--centered" : ""}`}>
        {workspaceContent}
      </div>
    </div>
  </main>
);
```

Update `apps/frontend/src/components/OwnerEventTypesPage.tsx` to import and use `OwnerWorkspaceNav` and the new `Workspace` type instead of embedding a two-tab nav.

Add these style blocks to `apps/frontend/src/styles.css`:

```css
.settings-page {
  width: min(100%, 1180px);
  display: grid;
  gap: 20px;
}

.settings-card {
  border: 1px solid rgba(24, 33, 23, 0.08);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 18px 48px rgba(54, 70, 52, 0.08);
  padding: 24px;
}

.weekday-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
  margin: 20px 0;
}

.weekday-toggle {
  min-height: 52px;
  border: 1px solid rgba(24, 33, 23, 0.1);
  border-radius: 18px;
  background: rgba(244, 247, 241, 0.84);
  cursor: pointer;
}

.weekday-toggle--selected {
  border-color: #182117;
  background: #182117;
  color: #fff;
}

.settings-time-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 220px));
  gap: 16px;
  margin-bottom: 16px;
}

.form-message--error {
  color: #8d2d2d;
}

.form-message--success {
  color: #1e6b37;
}

@media (max-width: 720px) {
  .weekday-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .settings-time-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Run the focused frontend tests to verify the new owner settings flow passes**

Run:

```bash
npm run frontend:test -- --run apps/frontend/src/lib/ownerSchedule.test.ts apps/frontend/src/components/OwnerSettingsPage.test.tsx apps/frontend/src/App.test.tsx
```

Expected:

```text
✓ apps/frontend/src/lib/ownerSchedule.test.ts (...)
✓ apps/frontend/src/components/OwnerSettingsPage.test.tsx (...)
✓ apps/frontend/src/App.test.tsx (...)
```

- [ ] **Step 5: Run the full frontend test suite and build**

Run:

```bash
npm run frontend:test -- --run
npm run frontend:build
```

Expected:

```text
Test Files  ... passed
vite v... building for production...
✓ built in ...
```

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src
git commit -m "feat: add owner schedule settings page"
```

### Task 6: Document Backend Usage And Validation Commands

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Write the failing documentation check by searching for backend commands**

Run:

```bash
rg "backend:dev|backend:test|apps/backend|Настройки" README.md AGENTS.md
```

Expected:

```text

```

No matches means the new backend flow is not documented yet.

- [ ] **Step 2: Update `README.md` with backend commands and settings flow**

Add these sections under `## ▶️ Запуск` and `## 📁 Структура репозитория`:

~~~md
/apps
  /frontend      # frontend приложение
  /backend       # backend приложение
~~~

~~~md
Запуск backend-приложения:

```bash
npm run backend:dev
```

Проверка backend-тестов:

```bash
npm run backend:test -- --run
```

Проверка backend-typecheck:

```bash
npm run backend:build
```
~~~

Add one short note to the owner workflow description:

~~~md
В owner-части приложения доступны:
- управление типами событий
- экран `Настройки` для задания рабочих дней недели и общего рабочего интервала
~~~

- [ ] **Step 3: Update `AGENTS.md` with backend structure and local validation commands**

Add or update these bullets:

~~~md
- `apps/backend/` — server application
~~~

~~~md
Backend commands are available once `apps/backend/` exists:

```bash
npm run backend:dev
npm run backend:build
npm run backend:test -- --run
```
~~~

Update the testing note with one backend-specific line:

~~~md
When backend tests are present:

* place API integration tests near `apps/backend/src/`
* keep pure time and validation helpers in small files under `apps/backend/src/lib/`
~~~

- [ ] **Step 4: Verify the documentation updates are visible**

Run:

```bash
rg "backend:dev|backend:test|apps/backend|Настройки" README.md AGENTS.md
```

Expected:

```text
README.md
AGENTS.md
```

- [ ] **Step 5: Commit**

```bash
git add README.md AGENTS.md
git commit -m "docs: add backend and owner settings workflow"
```

## Self-Review

Spec coverage check:

- schedule contract update is covered by Task 1
- in-memory Fastify backend scaffold is covered by Task 2
- schedule validation and event-type endpoints are covered by Task 3
- availability, booking conflict handling, cancellation, and booking history are covered by Task 4
- owner `Настройки` page and schedule UI are covered by Task 5
- local commands and structure documentation are covered by Task 6

Placeholder scan:

- no `TBD`, `TODO`, or deferred placeholder tasks remain
- each task includes concrete files, commands, and code snippets

Type consistency check:

- `OwnerSchedule`, `DayOfWeek`, `Workspace`, `CreateBookingInput`, and route paths use the same names across tasks
- frontend `scheduleApi.ts` matches backend `GET /schedule` and `PUT /schedule`
- booking routes and conflict codes match the approved spec language