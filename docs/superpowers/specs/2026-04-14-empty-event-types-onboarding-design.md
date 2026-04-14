# Empty Event Types Onboarding Design

## Context

When the owner opens the app with no active event types, the public `Бронирования` screen still renders a calendar shell with a disabled `Записаться` button. The page explains that booking is unavailable, but it does not direct the owner to the next action.

## Goal

Make the zero-event-types state actionable:

- first open should land on `Типы событий` when the owner has no event types at all
- `Бронирования` should show a dedicated onboarding state with a CTA to the event types workspace

## Non-Goals

- change the API contract
- redesign guest booking flow when event types exist
- add persistence for first-run onboarding

## Product Decision

Use a combined onboarding model:

1. If owner event types load successfully and the list is empty, the app opens `Типы событий`.
2. If the owner later opens `Бронирования` while there are still no active public event types, the page shows a clear empty state with a CTA to `Типы событий`.

## Proposed Behavior

### Startup routing

- Scenario mode with zero event types should initialize on `owner-event-types`.
- Remote mode should switch to `owner-event-types` after owner event types finish loading and the result is an empty list.
- Owner event type load failures must not trigger the redirect.

### Public bookings empty state

When `Бронирования` is opened with no active guest event types and there is no startup loading or startup error preventing a more specific message:

- hide the normal booking calendar layout
- show an onboarding card inside the public page
- explain that at least one event type must be added before bookings can be accepted
- provide a primary CTA that switches workspace to `Типы событий`

### Guardrail copy

The disabled booking CTA may stay visible for other failure states, but the zero-event-types state should prefer the dedicated onboarding block over a passive disabled explanation.

## Testing Impact

Update frontend integration tests to cover:

- scenario startup with zero event types opening `Типы событий`
- remote startup with empty owner event types opening `Типы событий`
- manual return to `Бронирования` showing the new onboarding state and CTA
