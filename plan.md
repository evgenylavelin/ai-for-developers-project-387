# Plan For TypeSpec Contract Implementation

## Goal

Implement the MVP API contract in `spec/` so that it matches the approved design document in [docs/superpowers/specs/2026-04-12-typespec-contract-design.md](/home/evgeny/projects/callplanner/docs/superpowers/specs/2026-04-12-typespec-contract-design.md).

The contract must describe only the approved owner and guest behavior:

- create event type
- list event types
- get availability for an event type
- create booking
- list bookings
- cancel booking

## Constraints

- `spec/` is the single source of truth.
- Do not add registration or authentication.
- Do not add extra roles.
- Do not add event type update, delete, or archive operations.
- Do not introduce a separate slot resource or `slotId`.
- Booking window is limited to the next 14 days.
- The same interval cannot be booked twice, even across different event types.

## Delivery Order

### 1. Inspect and align the TypeSpec workspace

- check existing `package.json`, `tspconfig.yaml`, and any current TypeSpec files
- create `spec/` only if it does not exist
- keep the initial file structure minimal

Expected outcome:

- a valid place to author the contract without introducing unnecessary scaffolding

### 2. Create the base TypeSpec entrypoint

- define the main namespace for the API
- add required imports for HTTP and REST modeling
- define service metadata needed for OpenAPI generation

Expected outcome:

- a compilable root TypeSpec file

### 3. Define shared scalar and error models

- define shared date-time usage for `startAt` and `endAt`
- define a consistent error response shape for `400`, `404`, and `409`
- keep the error model compact and reusable across operations

Expected outcome:

- common models that support consistent API responses

### 4. Define domain models and enum

- `EventType`
- `AvailableSlot`
- `Booking`
- `BookingStatus`

Field decisions to enforce:

- `EventType`: `id`, `title`, `description?`, `durationMinutes`
- `AvailableSlot`: `startAt`, `endAt`
- `Booking`: `id`, `eventTypeId`, `startAt`, `endAt`, `guestName`, `guestEmail`, `status`
- `BookingStatus`: `active`, `cancelled`

Expected outcome:

- all core response models captured in TypeSpec

### 5. Define request models separately from resource models

- `CreateEventTypeRequest`
- `CreateBookingRequest`

Validation-oriented requirements to encode in descriptions and constraints:

- `title` is required
- `durationMinutes` is required and positive
- `guestName` is required
- `guestEmail` is required

Expected outcome:

- request payloads are explicit and not overloaded with response-only fields

### 6. Define operations in approved API shape

Implement these operations and no others:

- `POST /event-types`
- `GET /event-types`
- `GET /event-types/{eventTypeId}/availability`
- `POST /bookings`
- `GET /bookings`
- `POST /bookings/{bookingId}:cancel`

For each operation:

- define success responses
- attach the shared error responses that apply
- describe whether the operation is owner-facing or guest-facing

Expected outcome:

- the full MVP API surface is present in the contract

### 7. Encode business rules in the contract descriptions

Make the following rules explicit in operation and model documentation:

- availability returns only free intervals
- availability covers only the next 14 days
- returned intervals are already aligned to the selected event type duration
- booking interval must match the selected event type duration
- the same interval cannot be booked twice across all event types
- cancellation changes booking status instead of deleting the record
- cancelled bookings remain visible in owner history
- cancelled intervals become available again

Expected outcome:

- backend and frontend teams can implement the same behavior without guessing

### 8. Compile early and often

After each major step, run TypeSpec compilation and fix issues immediately.

Suggested checkpoints:

- after the base entrypoint
- after shared models
- after domain models
- after operations
- after OpenAPI generation

Expected outcome:

- syntax and modeling errors are caught incrementally

### 9. Generate and review OpenAPI output

- generate OpenAPI from the TypeSpec contract
- verify paths, schemas, status codes, and required fields
- confirm there are no undocumented operations or models

Review focus:

- operation naming is clear
- request and response shapes are minimal and sufficient
- booking cancellation is modeled as a state transition
- no auth scheme was introduced by accident

Expected outcome:

- the generated contract matches the approved design

### 10. Update documentation only if tooling or structure changes

- if new TypeSpec tooling or commands are introduced beyond what already exists, document them in `README.md`
- if repository structure changes materially, keep it aligned with `AGENTS.md`

Expected outcome:

- repo documentation stays consistent with the actual setup

## Suggested Minimal File Layout

Keep the initial layout small. A good starting point is:

- `spec/main.tsp`
- `spec/models.tsp`
- `spec/routes.tsp`
- `spec/errors.tsp`

If that becomes awkward, split further only after the contract is stable.

## Definition Of Done

This task is done when:

- `spec/` contains a compilable TypeSpec contract
- the contract matches the approved design doc
- the generated OpenAPI reflects only the approved MVP behavior
- no extra flows or roles were added
- business rules are explicit enough for backend and frontend implementation
