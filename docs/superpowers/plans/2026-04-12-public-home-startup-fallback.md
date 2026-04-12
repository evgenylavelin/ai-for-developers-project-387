# Public Home Startup Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public home page render on startup even when initial API requests fail, and show inline retryable warnings instead of a full-screen fatal error.

**Architecture:** Keep the existing app shell and routing model in [apps/frontend/src/App.tsx](/home/evgeny/projects/callplanner/apps/frontend/src/App.tsx), but replace the single fatal startup branch with independent public load states for event types, bookings, and availability. Surface those failures as one aggregate inline banner on the public home and guard booking entry points when required data is missing.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library

---

### Task 1: Lock In Failing Startup Tests

**Files:**
- Modify: `apps/frontend/src/App.test.tsx`
- Test: `apps/frontend/src/App.test.tsx`

- [ ] **Step 1: Add a test for bookings failure that still renders the public home**

```tsx
it("renders the public home with an inline warning when bookings fail to load", async () => {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);

    if (url.endsWith("/owner/event-types")) {
      return Promise.resolve(createJsonResponse([]));
    }

    if (url.endsWith("/event-types")) {
      return Promise.resolve(
        createJsonResponse([
          {
            id: "standard",
            title: "Стратегическая сессия",
            durationMinutes: 30,
          },
        ]),
      );
    }

    if (url.endsWith("/bookings")) {
      return Promise.reject(new Error("network down"));
    }

    if (url.endsWith("/event-types/standard/availability")) {
      return Promise.resolve(createJsonResponse([]));
    }

    throw new Error(`Unexpected request: ${url}`);
  });

  vi.stubGlobal("fetch", fetchMock);

  render(<App />);

  expect(await screen.findByRole("heading", { name: "Бронирования" })).toBeInTheDocument();
  expect(screen.getByText("Часть данных не удалось загрузить."))..toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "Не удалось загрузить данные" }),
  ).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Add a test for event types failure that keeps the page open and blocks booking**

```tsx
it("keeps the public home open and disables booking when event types fail to load", async () => {
  const bookingDay = createApiBookingDay();

  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);

    if (url.endsWith("/owner/event-types")) {
      return Promise.resolve(createJsonResponse([]));
    }

    if (url.endsWith("/event-types")) {
      return Promise.reject(new Error("network down"));
    }

    if (url.endsWith("/bookings")) {
      return Promise.resolve(
        createJsonResponse([
          {
            id: "booking-1",
            eventTypeId: "standard",
            startAt: `${bookingDay.isoDate}T09:00:00Z`,
            endAt: `${bookingDay.isoDate}T09:30:00Z`,
            guestName: "Иван Петров",
            guestEmail: "ivan@example.com",
            status: "active",
          },
        ]),
      );
    }

    throw new Error(`Unexpected request: ${url}`);
  });

  vi.stubGlobal("fetch", fetchMock);

  render(<App />);

  expect(await screen.findByRole("heading", { name: "Бронирования" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Записаться" })).toBeDisabled();
  expect(screen.getByText("Запись временно недоступна: не удалось загрузить типы событий."))
    .toBeInTheDocument();
});
```

- [ ] **Step 3: Add a retry test that clears the inline warning after successful reload**

```tsx
it("retries startup loading from the inline warning and clears it after success", async () => {
  const bookingDay = createApiBookingDay();
  let shouldFailBookings = true;

  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);

    if (url.endsWith("/owner/event-types")) {
      return Promise.resolve(createJsonResponse([]));
    }

    if (url.endsWith("/event-types")) {
      return Promise.resolve(
        createJsonResponse([
          {
            id: "standard",
            title: "Стратегическая сессия",
            durationMinutes: 30,
          },
        ]),
      );
    }

    if (url.endsWith("/bookings")) {
      if (shouldFailBookings) {
        return Promise.reject(new Error("network down"));
      }

      return Promise.resolve(
        createJsonResponse([
          {
            id: "booking-1",
            eventTypeId: "standard",
            startAt: `${bookingDay.isoDate}T09:00:00Z`,
            endAt: `${bookingDay.isoDate}T09:30:00Z`,
            guestName: "Иван Петров",
            guestEmail: "ivan@example.com",
            status: "active",
          },
        ]),
      );
    }

    if (url.endsWith("/event-types/standard/availability")) {
      return Promise.resolve(createJsonResponse([]));
    }

    throw new Error(`Unexpected request: ${url}`);
  });

  vi.stubGlobal("fetch", fetchMock);

  const user = userEvent.setup();

  render(<App />);

  expect(await screen.findByText("Часть данных не удалось загрузить.")).toBeInTheDocument();

  shouldFailBookings = false;
  await user.click(screen.getByRole("button", { name: "Повторить" }));

  expect(await screen.findByText("Иван Петров")).toBeInTheDocument();
  expect(screen.queryByText("Часть данных не удалось загрузить.")).not.toBeInTheDocument();
});
```

- [ ] **Step 4: Run the focused frontend test file and verify the new tests fail first**

Run: `npm run frontend:test -- --run src/App.test.tsx`

Expected: FAIL with missing inline warning text or with the old full-screen startup error still being rendered.

- [ ] **Step 5: Commit the red tests**

```bash
git add apps/frontend/src/App.test.tsx
git commit -m "test: cover non-fatal public startup"
```

### Task 2: Replace Fatal Startup Rendering With Independent Public Load State

**Files:**
- Modify: `apps/frontend/src/App.tsx`
- Test: `apps/frontend/src/App.test.tsx`

- [ ] **Step 1: Add grouped public load errors and make the remote app default to the home screen**

```tsx
const [publicLoadErrors, setPublicLoadErrors] = useState({
  bookings: "",
  eventTypes: "",
  availability: "",
});
const [screen, setScreen] = useState<"home" | "booking">("home");

const hasPublicStartupIssue = Boolean(
  publicLoadErrors.bookings || publicLoadErrors.eventTypes || publicLoadErrors.availability,
);
```

- [ ] **Step 2: Rewrite the startup loader so public requests fail independently instead of throwing one fatal error**

```tsx
async function loadRemoteState() {
  setLoading(true);
  setPublicLoadErrors({ bookings: "", eventTypes: "", availability: "" });

  const nextErrors = {
    bookings: "",
    eventTypes: "",
    availability: "",
  };

  let loadedGuestEventTypes: EventType[] = [];
  let loadedBookings: Booking[] = [];
  let loadedAvailability: AvailabilityByEventType = {};

  try {
    loadedGuestEventTypes = await getGuestEventTypes();
  } catch (error) {
    nextErrors.eventTypes =
      error instanceof Error ? error.message : "Не удалось загрузить типы событий.";
  }

  try {
    loadedBookings = await listBookings();
  } catch (error) {
    nextErrors.bookings =
      error instanceof Error ? error.message : "Не удалось загрузить бронирования.";
  }

  if (loadedGuestEventTypes.length > 0) {
    try {
      loadedAvailability = Object.fromEntries(
        await Promise.all(
          loadedGuestEventTypes.map(async (eventType) => [
            eventType.id,
            await getAvailability(eventType.id),
          ]),
        ),
      ) as AvailabilityByEventType;
    } catch (error) {
      nextErrors.availability =
        error instanceof Error ? error.message : "Не удалось загрузить доступные слоты.";
    }
  }

  if (!alive) {
    return;
  }

  setGuestEventTypes(loadedGuestEventTypes);
  setBookings(loadedBookings);
  setAvailabilityByEventType(loadedAvailability);
  setPublicLoadErrors(nextErrors);
  setActionError("");
  setScreen("home");
  setSuccessDestination("home");
  setSelectedHomeDate(getInitialSelectedDate(buildPublicCalendarDays(), loadedBookings));
}
```

- [ ] **Step 3: Remove the full-screen initial error return and replace it with inline state in the normal render path**

```tsx
{hasPublicStartupIssue && workspace === "public" ? (
  <div className="inline-warning" role="alert">
    <p>Часть данных не удалось загрузить.</p>
    <button
      type="button"
      className="secondary-button"
      onClick={() => setReloadToken((currentToken) => currentToken + 1)}
    >
      Повторить
    </button>
  </div>
) : null}
```

- [ ] **Step 4: Keep owner event types isolated from public startup**

```tsx
void getOwnerEventTypes()
  .then((loadedOwnerEventTypes) => {
    if (!alive) {
      return;
    }

    setOwnerEventTypes(loadedOwnerEventTypes);
    setOwnerEventTypesError("");
  })
  .catch((error) => {
    if (!alive) {
      return;
    }

    setOwnerEventTypes([]);
    setOwnerEventTypesError(
      error instanceof Error
        ? error.message
        : "Не удалось загрузить типы событий владельца.",
    );
  });
```

- [ ] **Step 5: Run the focused frontend test file and verify the startup tests pass**

Run: `npm run frontend:test -- --run src/App.test.tsx`

Expected: PASS for the new startup fallback tests and the existing owner-event-types startup test.

- [ ] **Step 6: Commit the startup state refactor**

```bash
git add apps/frontend/src/App.tsx apps/frontend/src/App.test.tsx
git commit -m "feat: keep public home visible on startup errors"
```

### Task 3: Guard Booking Entry Points And Clarify Public Empty States

**Files:**
- Modify: `apps/frontend/src/App.tsx`
- Modify: `apps/frontend/src/components/PublicBookingsHome.tsx`
- Test: `apps/frontend/src/App.test.tsx`

- [ ] **Step 1: Extend the public home props to accept booking availability status and startup warning details**

```tsx
type PublicBookingsHomeProps = {
  bookings: Booking[];
  eventTypes: EventType[];
  availableDatesByEventType: AvailableDatesByEventType;
  calendarDays: CalendarDay[];
  initialSelectedDate?: string;
  workspace: Workspace;
  startupWarning?: string;
  bookingDisabledReason?: string;
  bookingsUnavailable?: boolean;
  onChangeWorkspace: (workspace: Workspace) => void;
  onRetryStartupLoad: () => void;
  onCancelBooking: (bookingId: string) => void;
  onStartBooking: (isoDate: string) => void;
};
```

- [ ] **Step 2: Render the inline warning and disable the booking CTA when event types or availability are missing**

```tsx
{startupWarning ? (
  <div className="inline-warning" role="alert">
    <p>{startupWarning}</p>
    <button type="button" className="secondary-button" onClick={onRetryStartupLoad}>
      Повторить
    </button>
  </div>
) : null}

<button
  type="button"
  className="primary-button"
  disabled={Boolean(bookingDisabledReason)}
  onClick={() => selectedDay && onStartBooking(selectedDay.isoDate)}
>
  Записаться
</button>

{bookingDisabledReason ? <p className="availability-note">{bookingDisabledReason}</p> : null}
```

- [ ] **Step 3: Avoid misleading empty-state copy when bookings could not be loaded**

```tsx
{bookingsUnavailable ? (
  <div className="day-panel__empty">
    <p>Не удалось загрузить бронирования для выбранной даты.</p>
    <p>Попробуйте повторить загрузку, чтобы увидеть актуальные записи.</p>
  </div>
) : selectedDayBookings.length === 0 ? (
  <div className="day-panel__empty">
    <p>На выбранную дату публичных бронирований пока нет.</p>
    <p>Можно сразу открыть форму записи и выбрать подходящий слот.</p>
  </div>
) : (
  <div className="booking-list">...</div>
)}
```

- [ ] **Step 4: Pass the derived warning and guard props from the app shell**

```tsx
const startupWarning = hasPublicStartupIssue ? "Часть данных не удалось загрузить." : "";
const bookingDisabledReason = publicLoadErrors.eventTypes
  ? "Запись временно недоступна: не удалось загрузить типы событий."
  : publicLoadErrors.availability
    ? "Запись временно недоступна: не удалось загрузить доступные слоты."
    : "";

<PublicBookingsHome
  bookings={bookings}
  eventTypes={guestEventTypes}
  availableDatesByEventType={datesByEventType}
  calendarDays={calendarDays}
  initialSelectedDate={selectedHomeDate}
  workspace="public"
  startupWarning={startupWarning}
  bookingDisabledReason={bookingDisabledReason}
  bookingsUnavailable={Boolean(publicLoadErrors.bookings)}
  onRetryStartupLoad={() => setReloadToken((currentToken) => currentToken + 1)}
  onChangeWorkspace={handleWorkspaceChange}
  onCancelBooking={...}
  onStartBooking={...}
/>
```

- [ ] **Step 5: Run the focused tests, then the full frontend suite**

Run: `npm run frontend:test -- --run src/App.test.tsx`
Expected: PASS

Run: `npm run frontend:test -- --run`
Expected: PASS

- [ ] **Step 6: Commit the UI guard changes**

```bash
git add apps/frontend/src/App.tsx apps/frontend/src/components/PublicBookingsHome.tsx apps/frontend/src/App.test.tsx
git commit -m "feat: guard public booking actions on startup failures"
```

## Self-Review

- Spec coverage check: startup render, inline warnings, retry, guarded booking actions, and owner isolation are each covered by Tasks 1-3.
- Placeholder scan: no `TODO`, `TBD`, or unresolved step references remain.
- Type consistency check: `publicLoadErrors`, `startupWarning`, `bookingDisabledReason`, and `bookingsUnavailable` are used consistently across the plan.