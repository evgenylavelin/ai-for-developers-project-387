# Public Home Startup Fallback Design

## Context

The public application currently treats the initial remote load as fatal. If the first request for public data fails, the app replaces the entire public home screen with a full-screen error state.

This makes the product feel unavailable even when the shell and large parts of the interface could still be rendered safely.

## Goal

Ensure the public home page always opens on initial load, even when one or more remote requests fail.

## Non-Goals

- Redesign the public home layout
- Introduce mock fallback data for failed API requests
- Change backend API behavior or the TypeSpec contract
- Refactor owner pages beyond isolating their load failures from the public startup flow

## Product Decision

Use a non-fatal startup model for the public home page.

- The public home shell must render even when remote data fails to load.
- Failed startup requests must degrade to safe empty states.
- Startup errors must be shown inline on the page instead of replacing the entire screen.
- Owner-specific load failures must not block the public home page.

## Current Problem

The frontend startup path couples multiple requests into a single fatal branch:

- guest event types
- public bookings
- availability for event types
- owner event types loaded in follow-up logic

If the initial public request group fails, the app renders a full-screen error panel instead of the public home page.

## Proposed Behavior

### Startup Rendering

For remote mode, the application should default to the public home screen instead of switching to a full-screen startup error.

The app shell, workspace navigation, and public bookings home must render regardless of startup request outcome.

### Independent Data Groups

Startup data is treated as separate groups with isolated failures.

#### Public event types

- Used by booking actions and public context
- If loading fails, the home page still renders
- Booking actions that require event types become unavailable until retry succeeds

#### Public bookings

- Used by the calendar detail and bookings list
- If loading fails, the home page still renders with an empty-safe bookings view
- The UI must not claim with certainty that there are no bookings; it should communicate a loading failure instead

#### Availability

- Derived from per-event-type availability requests
- If loading fails, booking entry points should remain guarded
- The page still renders with a clear message that booking availability could not be loaded

#### Owner event types

- Loaded for owner workspace only
- Failure must remain local to owner functionality
- Failure must not affect the public home startup path

## Error Presentation

The public home page should use an inline error banner instead of a full-screen blocking state.

Banner requirements:

- visible near the top of the page
- indicates that part of the data could not be loaded
- includes a retry action
- disappears automatically after a successful retry

The inline banner is an aggregate public-facing warning. Owner-specific sections can continue to use local errors within their own workspace.

## Empty-State Rules

Safe fallbacks must be explicit and non-misleading.

- Failed bookings load: show the page and an error banner, but do not present the result as confirmed absence of bookings
- Failed event types load: keep the page visible and disable or guard booking actions with a clear explanation
- Failed availability load: keep the page visible and prevent entering booking flow that depends on unavailable slot data

## Retry Behavior

Retry should re-run only the failed or required public startup requests and update the rendered page in place.

After a successful retry:

- the inline banner disappears
- public home sections refresh without a full page reload
- booking actions become available again if their required data is now present

## State Design

The frontend should move away from a single fatal startup error flag for public rendering.

Recommended state model:

- keep the public shell renderable at all times after app mount
- track load status and error state per public data group
- compute public warning visibility from those grouped error states
- keep owner-specific errors separate from public startup concerns

## Testing Impact

Update frontend tests to cover:

- the public home rendering when bookings request fails
- the public home rendering when event types request fails
- inline warning visibility instead of full-screen startup failure
- retry clearing the warning after successful reload
- owner-event-type failure not blocking the public home page

## Acceptance Criteria

1. Opening the app in remote mode always renders the public home page shell.
2. A failed startup request no longer replaces the page with a full-screen error panel.
3. Public startup failures are shown as inline warnings with retry.
4. Booking actions are safely guarded when required data is unavailable.
5. Owner-specific loading failures do not block the public startup experience.