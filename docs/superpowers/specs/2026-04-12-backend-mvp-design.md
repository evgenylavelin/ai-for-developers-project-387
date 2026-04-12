# Backend MVP Design For Contract-Based API

## Goal

Define the backend implementation design for the current course step so the server-side application can be built from the existing API contract, with a minimal contract extension for owner schedule management.

The backend must:

- expose the API for a separate frontend client
- keep booking rules on the server side
- use in-memory storage only
- support owner-controlled working days and working time
- preserve the existing design-first workflow, where contract changes come before backend implementation

## Scope

This design covers:

- backend stack selection
- backend application structure
- in-memory data storage
- minimal frontend owner schedule UI
- owner schedule API and behavior
- availability generation for the next 14 days
- booking creation, listing, and cancellation
- conflict handling for already booked slots
- backend test coverage for the MVP

This design does not cover:

- authentication or authorization
- persistent database storage
- recurring exceptions, holidays, or per-date overrides
- multiple time intervals per day
- per-event-type schedules
- broader owner settings beyond schedule management
- notifications, reminders, or integrations

## Decisions

### Runtime And Framework

The backend will use:

- Node.js
- TypeScript
- Fastify

Rationale:

- it fits the existing TypeScript-based repository
- it keeps the backend simple and explicit for an educational MVP
- it does not force domain behavior into a heavy framework structure
- it is easy to organize around the contract instead of around framework conventions

### Storage Strategy

The backend will use in-memory storage only.

Implications:

- data is reset when the service restarts
- no database is introduced at this stage
- repositories should still be isolated behind clear interfaces so storage can be replaced later without rewriting business logic

This follows the course requirement for the step and keeps the focus on implementing the contract and business rules.

### Scheduling Model

The system will use one global owner schedule for the whole calendar.

The schedule contains:

- `workingDays`: selected days of week
- `startTime`: one common start time for all selected days
- `endTime`: one common end time for all selected days

The schedule is not attached to an event type.

The schedule has no separate timezone setting in the MVP. It is interpreted in UTC.

### Frontend Scope

The MVP also includes a minimal owner-facing frontend screen for schedule management.

This is required so the behavior "the owner sets working days and working time" exists end-to-end, not only as backend API behavior.

## Contract Changes

The existing contract must be extended before backend implementation starts.

New resource:

- `GET /schedule`
- `PUT /schedule`

Recommended model shape:

### DayOfWeek

Enum values:

- `monday`
- `tuesday`
- `wednesday`
- `thursday`
- `friday`
- `saturday`
- `sunday`

### Schedule

Fields:

- `workingDays: DayOfWeek[]`
- `startTime: string`
- `endTime: string`

Rules:

- at least one working day is required
- `startTime` and `endTime` use `HH:mm` format
- `startTime` must be earlier than `endTime`
- the same schedule applies to all selected days of week

### ScheduleResponse

- `200 OK` with `Schedule`

### UpdateScheduleRequest

- `workingDays`
- `startTime`
- `endTime`

### UpdateScheduleResponse

- `200 OK` with updated `Schedule`

### Schedule Errors

- `400 Bad Request` for invalid time format, empty working day list, or `startTime >= endTime`

## API Behavior

### GET /schedule

Returns the current owner schedule.

For the MVP, the backend may initialize in-memory storage with a default schedule so the endpoint always returns a valid schedule even before the first update.

### PUT /schedule

Replaces the current owner schedule.

Validation rules:

- request body must contain at least one day
- day values must belong to the declared enum
- `startTime` and `endTime` must parse as `HH:mm`
- `startTime` must be earlier than `endTime`

## Frontend Behavior

The frontend must expose owner schedule management through the existing application shell.

### Owner Navigation

The current top-level navigation is extended with a new owner link:

- `Бронирования`
- `Типы событий`
- `Настройки`

The new `Настройки` item opens a separate owner page dedicated to schedule management.

### Settings Screen

The `Настройки` page contains one focused card: `Рабочее расписание`.

The page should not include unrelated owner settings in this phase.

### Schedule Form

The card contains:

- page heading and brief explanatory copy
- weekday selector with seven day buttons
- `Начало` time input
- `Конец` time input
- primary action `Сохранить расписание`
- inline validation and save feedback area

The weekday selector represents the same `workingDays` values used by the API, while the time inputs map directly to `startTime` and `endTime`.

### Frontend Data Flow

The screen behavior is:

1. on load, request current schedule with `GET /schedule`
2. populate weekday selection and time inputs from the response
3. allow the owner to toggle selected days
4. allow the owner to edit start and end time through native time inputs
5. on save, submit the full schedule with `PUT /schedule`
6. show inline validation or success feedback after the request resolves

### Frontend Validation

The frontend should provide basic validation before sending the request:

- at least one day selected
- both time fields filled in
- start time earlier than end time

The backend remains the source of truth for validation and must still reject invalid requests.

### Responsive Behavior

Required layout behavior:

- on desktop, weekday buttons may sit in one row and time inputs may appear side by side
- on mobile, weekday buttons may wrap and time inputs stack vertically
- the page must remain clear without modals or hidden edit states

### GET /event-types

Returns all existing event types.

No behavior change is introduced here.

### POST /event-types

Creates an event type with positive `durationMinutes`.

No behavior change is introduced here besides backend implementation.

### GET /event-types/{eventTypeId}/availability

Returns only free slots for the selected event type for the next 14 days.

Availability generation rules:

1. find the event type by id, otherwise return `404`
2. take the current UTC date and build a 14-day window
3. for each date in the window, check whether its weekday is included in `workingDays`
4. if the weekday is allowed, build the common schedule interval for that date using `startTime` and `endTime`
5. split the interval into slots aligned to `durationMinutes`
6. exclude intervals occupied by `active` bookings
7. return the remaining slots as `startAt` and `endAt`

Notes:

- slots are derived data and are not stored as separate records
- cancelled bookings do not block availability
- partial trailing fragments smaller than `durationMinutes` are ignored

### POST /bookings

Creates a booking only if the requested interval is valid and free.

Validation rules:

1. request body must be structurally valid
2. `eventTypeId` must exist, otherwise return `404`
3. `startAt` and `endAt` must be valid UTC timestamps
4. `startAt` must be earlier than `endAt`
5. interval duration must exactly match the selected event type duration
6. interval must fall inside the next 14 days
7. interval weekday must belong to the current schedule
8. interval must fit fully inside the schedule time range for that date
9. the exact interval must not already be held by another `active` booking, even for a different event type

Error behavior:

- `400 Bad Request` for malformed payloads or malformed timestamps
- `404 Not Found` for unknown `eventTypeId`
- `409 Conflict` for unavailable, out-of-window, out-of-schedule, or already booked intervals

### GET /bookings

Returns the full booking list.

The list includes both:

- `active`
- `cancelled`

### POST /bookings/{bookingId}:cancel

Changes booking status from `active` to `cancelled`.

Rules:

- return `404` if booking does not exist
- return `409` if booking is already cancelled
- otherwise update status to `cancelled` and return the updated booking
- once cancelled, the interval becomes available again

## Business Rules

The backend must enforce these rules on the server side:

1. booking is limited to the next 14 days
2. only free slots can be booked
3. the same interval cannot be booked twice, even across different event types
4. a booking interval must match the selected event type duration exactly
5. availability is derived from schedule, event type duration, current time, and active bookings
6. cancelled bookings remain visible in history
7. cancelling a booking makes the interval available again

## Backend Architecture

Recommended backend location:

- `apps/backend`

Recommended structure:

- `apps/backend/src/server.ts` — process entry point
- `apps/backend/src/app.ts` — Fastify app creation and dependency wiring
- `apps/backend/src/routes/` — HTTP route registration for `event-types`, `bookings`, and `schedule`
- `apps/backend/src/services/` — domain services for schedule, availability, event types, and bookings
- `apps/backend/src/repositories/` — in-memory storage implementations
- `apps/backend/src/lib/` — date, time, and interval helpers
- `apps/backend/src/errors/` — mapping domain failures to contract-aligned HTTP responses

Boundary rule:

- route handlers should stay thin
- business rules must live in services and reusable helpers
- repositories should not contain HTTP concerns

Frontend boundary rule:

- the settings page should stay focused on displaying and editing schedule data
- API access should be isolated from visual components where practical
- frontend validation must complement, not replace, backend validation

## In-Memory State

The backend stores three domain collections in memory:

- event types
- bookings
- one global schedule

Implementation options are flexible, but `Map`-based repositories are preferred because lookups by id are direct and explicit.

The schedule may be stored as a single value object because only one owner schedule exists.

## Testing Strategy

The backend should include automated tests for both happy-path and rule enforcement.

Minimum required coverage:

1. create event type with valid duration
2. reject event type with non-positive duration
3. read current schedule
4. update schedule with valid working days and time range
5. reject invalid schedule payloads
6. return availability only for allowed weekdays and within the configured time range
7. align availability to event type duration
8. create booking for a valid free slot
9. reject booking for unknown event type
10. reject booking for an already booked slot with `409`
11. reject booking outside the 14-day window
12. reject booking outside configured schedule bounds
13. cancel an active booking
14. reject repeated cancellation with `409`
15. make the slot available again after cancellation
16. return active and cancelled bookings in booking history

API-level tests are preferred because they validate both HTTP behavior and domain rules together.

## Implementation Order

The implementation should follow this order:

1. update the TypeSpec contract with schedule models and routes
2. regenerate the OpenAPI output
3. scaffold `apps/backend`
4. implement in-memory repositories and domain services
5. implement HTTP routes aligned with the contract
6. add automated tests for contract behavior and rule enforcement
7. add the owner `Настройки` screen and connect it to `GET /schedule` and `PUT /schedule`
8. add frontend tests for schedule form behavior
9. update README with backend run and test commands once the backend tooling exists

## Risks And Constraints

Known simplifications for this MVP:

- no persistence across restarts
- no timezone selection beyond UTC interpretation
- no support for multiple intervals per day
- no support for ad hoc blocked dates or custom availability overrides
- owner settings UI covers only schedule management

These are accepted tradeoffs for the current course step and should not be expanded unless the assignment changes.