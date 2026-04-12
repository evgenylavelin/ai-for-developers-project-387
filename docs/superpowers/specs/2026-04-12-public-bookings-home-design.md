# Public Bookings Home Design For Call Planner

## Goal

Define the UX and product behavior for a public bookings home screen that becomes the primary entry point when bookings already exist.

This design extends the current guest booking flow with a public bookings overview for the educational MVP. It intentionally preserves the no-auth constraint and explicitly documents the consequences of that decision.

## Scope

This design covers:

- entry behavior based on whether bookings exist
- the public bookings home screen
- filtering by event type on the bookings screen
- daily calendar aggregates
- booking list behavior for the selected day
- public cancellation from the bookings screen
- responsive layout expectations for desktop and mobile
- required contract changes at a behavior level

This design does not cover:

- authentication or guest identification
- private "my bookings" behavior
- owner-only admin UI
- backend implementation details
- notification flows
- cancellation confirmation emails or tokens

## Product Positioning

For this MVP, the system does not distinguish one guest from another.

As a result, the bookings screen is not a private guest cabinet and must not be described as "my bookings". It is a public calendar and list of all bookings in the system.

This is an intentional educational simplification.

## Entry Behavior

The application has two entry paths:

### Zero Bookings

If there are no bookings in the system, the application opens the existing guest booking flow immediately.

Rules:

- no intermediate bookings screen is shown
- the current guest booking flow remains the initial screen

### One Or More Bookings

If one or more bookings exist, the application opens the public bookings home screen first.

Rules:

- the bookings home becomes the default public landing state
- the user can still create a new booking from this screen

## Screen Purpose

The public bookings home must support two goals at once:

- give a quick overview of when the calendar is occupied
- allow a visitor to open the booking flow for a selected day

The screen must also expose existing bookings clearly enough for this educational MVP, including full booking details and public cancellation.

## Information Architecture

The bookings home screen contains:

1. page heading
2. event-type filter chips
3. calendar with daily aggregates
4. selected-day panel with a list of bookings for that day

The selected-day panel is the main action area for the currently chosen date.

## Event-Type Filter

The screen shows a compact filter row with:

- `Все`
- one chip per event type

Rules:

- the default selected filter is `Все`
- selecting a specific event type updates the calendar aggregates for that event type
- the filter stays on the same screen as the calendar
- the filter is not placed in a separate preliminary step

For a selected day, event types that have no relevant availability may be shown as disabled rather than hidden. The filter should stay visually stable instead of reflowing unexpectedly.

## Calendar Behavior

The calendar provides a day-level overview.

### In `Все` Mode

When the `Все` filter is selected:

- each day shows only the count of booked items
- the UI does not show free-slot counts

This avoids misleading math when event types have different durations.

### In Specific Event-Type Mode

When a concrete event type is selected:

- each day shows:
  - `booked`
  - `free`
- both values are calculated for the selected event type only

### Day States

The calendar should visually distinguish:

- selected day
- day with bookings
- day without bookings
- day with no free slots for the selected event type
- unavailable or out-of-window days if the UI exposes them

### Booking Window

The booking-related calendar behavior must stay aligned with the contract rule that booking is limited to the next 14 days.

## Selected-Day Panel

The selected-day panel shows details for the active calendar date.

Content:

- full selected date
- action button `Записаться`
- list of bookings for that day

The booking action is intentionally placed in the selected-day header rather than in the global page header. This keeps the action tied to the current date choice.

## Booking Action Placement

The approved placement is:

- `Записаться` in the header of the selected-day panel

Reasons:

- the action clearly relates to the chosen date
- it works well on both wide and narrow layouts
- it avoids competing visually with the page heading and filter row

## Booking List

The selected-day panel shows all bookings for the chosen date.

Each booking card contains:

- event type title
- date and time interval
- guest name
- guest email
- booking status
- cancellation action for active bookings

Cancelled bookings remain visible in the list and must not disappear after cancellation.

## Cancellation Behavior

For this educational MVP, cancellation is publicly available for any active booking.

Rules:

- the `Отменить` action is shown for `active` bookings
- `cancelled` bookings show status only and no active cancel button
- after cancellation, the booking remains visible with status `cancelled`
- calendar aggregates and day details update after cancellation

This behavior is intentionally unsafe for production and must be treated as an educational simplification.

## New Booking Flow From The Screen

Pressing `Записаться` from the selected-day panel opens the booking flow.

Rules:

- the action should preserve the current date context when possible
- after successful booking, the user sees a short success screen
- the success screen provides a path back to the bookings screen

The flow should not force the user to rediscover the bookings home after a successful booking.

## Responsive Layout

The screen must be adaptive for both wide displays and mobile devices.

### Desktop And Wide Screens

Use a split layout:

- calendar on the left
- selected-day panel on the right

This layout keeps overview and detail visible at the same time.

### Mobile Screens

Use a single-column layout:

- calendar first
- selected-day panel directly below the calendar

The selected-day content must remain easy to scan without horizontal overflow.

## Empty And Transitional States

The screen needs clear supporting states:

### No Bookings In System

- skip the bookings home entirely
- open the guest booking flow directly

### No Bookings For Selected Day

- keep the selected-day panel visible
- show an explicit empty state for that date
- keep `Записаться` available in the selected-day header

### No Free Slots For Selected Event Type

- keep the day selectable
- show that free booking is unavailable for the chosen type
- booked items may still be visible for the day

## Terminology

The interface must avoid private-account language.

Use terms like:

- `Бронирования`
- `Календарь`
- `Записаться`

Avoid terms like:

- `Мои бронирования`
- `Личный кабинет`

## Contract Alignment

The design implies the following behavior changes at contract level:

### `GET /bookings`

This operation should no longer be described as owner-only for the MVP.

It must be documented as returning the public list of all bookings, including both:

- `active`
- `cancelled`

### `POST /bookings/{bookingId}:cancel`

This operation remains available and should explicitly document that, for the educational MVP, any visitor may cancel any active booking.

### Calendar Aggregates

The design does not require a new aggregate endpoint as a first step.

A minimal contract-aligned implementation may use:

- booking list data for booked counts
- event-type-specific availability for free counts when a specific event type is selected

The UI must not display free-slot counts in `Все` mode.

## Risks And Constraints

This design intentionally accepts the following risks:

- all booking details are publicly visible
- any visitor can cancel any active booking
- the system does not distinguish guests from one another

These choices are acceptable only because this is an educational MVP.

If the product later moves toward realistic usage, the contract and UI must be redesigned around private guest access and controlled cancellation.

## Final Behavioral Summary

The approved public bookings home works as follows:

- if there are no bookings, open the booking flow immediately
- if bookings exist, open the public bookings home
- show event-type chips on the bookings screen itself
- default filter is `Все`
- in `Все` mode, show only booked counts in the calendar
- in a specific event-type mode, show both free and booked counts
- show booking details for the selected day
- place `Записаться` in the selected-day header
- keep cancelled bookings visible
- support desktop split layout and mobile stacked layout

