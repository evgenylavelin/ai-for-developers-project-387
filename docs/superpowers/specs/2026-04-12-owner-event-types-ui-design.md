# Owner Event Types UI Design For Call Planner

## Goal

Define the owner-facing interface for managing event types in the frontend application without implementing real CRUD logic yet.

This design covers only UI structure and mock-state behavior for creating, editing, deleting, and archiving event types. Backend behavior, contract updates, and real persistence are intentionally deferred to a later phase.

## Scope

This design covers:

- a separate owner page inside the existing frontend app
- the screen layout for event type management
- UI-only CRUD states for event types
- archive behavior as a visible UI rule
- responsive behavior for desktop and mobile
- visual preparation for future concurrent editing states

This design does not cover:

- backend or API implementation
- real contract changes in `spec/`
- actual slot-generation logic for 14 days
- owner working hours management
- authentication or roles
- real-time synchronization

## Product Constraints

The repository constraints still apply:

- no registration or authentication
- one fixed owner profile
- anonymous guest booking
- booking window remains limited to 14 days
- the same time slot cannot be booked twice, even across event types

This design only adds an owner-facing interface for event type management. It does not change booking behavior.

## Screen Position In The App

The owner interface is a separate page within `apps/frontend/`.

At the current stage, the application should visually support two distinct areas:

- the public booking area
- the owner page `Управление типами событий`

The owner page must not replace the public flow. It is entered via a separate navigation action and appears as a dedicated workspace.

## Chosen Layout

The approved layout is:

- list of event types on the left
- form panel on the right

This split layout is the default desktop experience because it supports all planned interface states cleanly:

- creating a new type
- editing an existing type
- showing archive state
- showing restrictions for used event types

## Desktop Layout

On desktop and other wide screens, the owner page uses a two-column layout:

- left column: event types list
- right column: form panel

The list column contains:

- page-local list heading
- action `+ Создать тип события`
- active and archived event types
- visual selection state for the current item
- compact status markers

The form panel contains:

- current mode heading
- fields for the selected or new event type
- contextual status or warning message
- primary and secondary actions appropriate to the state

The user must be able to understand the selected item and the available action without leaving the page or opening a modal.

## Mobile Layout

On narrow screens, the page becomes a single-column stacked layout:

- event types list first
- form panel below

The mobile page must preserve the same screen states as desktop without moving editing into a modal.

When a type is selected, the UI may scroll the user toward the form panel, but the relationship between selected item and active form must remain explicit.

## Event Type Data In Scope

At this stage the form manages only these fields:

- `Название`
- `Описание`
- `Длительность`

No additional fields are introduced in this phase.

## Event Type List

The list must show both active and archived types.

Each item should display at minimum:

- title
- duration
- current status

Supported visible statuses:

- `Активен`
- `Архив`
- `Использовался в бронированиях`

The status `Использовался в бронированиях` is important because it changes the available destructive action in the form.

Archived types must remain visible so the owner can understand they still exist for historical bookings and future filtering.

## Form Modes

The form panel supports two primary modes:

### Create Mode

This mode is opened by `+ Создать тип события`.

Rules:

- form title becomes `Новый тип события`
- fields are empty
- primary action is `Сохранить`
- `Удалить` is not shown
- `Архивировать` is not shown

### Edit Mode

This mode is opened by selecting an item in the list.

Rules:

- form is populated with the selected type data
- selected type remains visually highlighted in the list
- the form shows current status markers and restrictions
- available destructive action depends on whether the type has already been used in bookings

## UI-Only CRUD States

This phase provides interface behavior only. It does not implement real CRUD operations.

The UI must support mock-state scenarios for:

- create
- edit
- delete confirmation
- archive confirmation
- empty state

These interactions may update local mock state in the frontend but must not be treated as real persistence.

## Delete And Archive Rules

The approved rule is:

- if an event type has never been used, the interface may offer deletion
- if an event type has already been used in active or historical bookings, deletion is unavailable
- in that case the interface offers archiving instead

### Delete UI State

For an unused event type, the form may show a delete action with a confirmation state.

The confirmation copy should communicate that the type will disappear from future booking choices.

After confirmation in the mock UI, the type disappears from the active list.

### Archive UI State

For a used event type, the form must not offer physical deletion.

Instead it should show a clear explanatory message, for example:

`Тип уже использовался в бронированиях. Его можно только архивировать.`

After archive confirmation in the mock UI:

- the type receives archived status
- it is no longer presented as available for future bookings
- it remains visible in the owner list

This preserves clarity for historical and active bookings tied to the archived type.

## Empty And Support States

If there are no event types yet, the list shows an empty state with a clear invitation to create the first type.

If an archived type is selected, the form remains readable and should still communicate its status clearly.

The screen should also reserve visual space for future multi-user support states, such as:

- `Тип был изменен в другой сессии`
- `Данные устарели, обновите форму`

These messages are placeholders at the design level only. They do not imply implementation in this phase.

## App-Level Navigation

The overall frontend should visually support a simple transition between:

- public bookings experience
- owner event-types page

The approved design assumes a visible navigation action in the app shell that opens the owner page as a separate workspace.

The owner page should read as administrative and intentional, while remaining part of the same application.

## Responsiveness Requirements

The page must work on both desktop and mobile without losing CRUD clarity.

Required responsive outcomes:

- desktop keeps list and form visible together
- mobile keeps list and form in one flow without modal editing
- current selection remains understandable on all breakpoints
- archived and used-state markers remain visible and legible

## Future Compatibility

Although this phase is UI-only, the design must not block later work on:

- contract-driven CRUD operations in `spec/`
- archive behavior for previously used event types
- concurrency indicators for multi-user editing
- future owner tools related to booking availability and 14-day slot logic

## Summary

The agreed owner UI is a separate frontend page with a responsive split-layout pattern that becomes stacked on mobile.

It visually supports full event-type CRUD states, but only as frontend interface behavior for now. Used event types cannot be deleted in the UI model and must be archived instead, while remaining visible for historical context.
