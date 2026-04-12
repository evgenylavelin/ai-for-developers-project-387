# Owner Event Types Form Mode CTA Design

## Goal

Refine the owner event types screen so the interface exposes only one create action at a time while keeping the existing shared form panel behavior for both creating and editing event types.

This design covers only the frontend interaction rules for the owner event types page. It does not change the API contract, backend behavior, or event type data model.

## Problem Statement

The current screen uses the right-side form panel for both create and edit states, but the left-side panel still shows separate create calls to action.

This creates two UX problems:

- the screen can invite the user to create a new event type even when the create form is already open
- the primary action label does not clearly distinguish between adding a new event type and saving changes to an existing one

The design must remove this ambiguity without breaking the edit scenario.

## Scope

This design covers:

- the left-panel create CTA visibility rules
- the right-panel mode labeling rules
- the primary action text for create and edit modes
- empty-state behavior when no event types exist yet

This design does not cover:

- API or persistence changes
- new form fields
- list sorting or filtering
- changes to delete and archive business rules

## Product Constraints

Existing repository constraints still apply:

- no registration or authentication
- one fixed owner profile
- anonymous guest booking
- booking window remains limited to 14 days
- the same time slot cannot be booked twice, even across event types

This design changes only owner-facing UI wording and state presentation.

## Core Rule

At any moment, the screen must present only one visible entry point for the create flow.

If the right panel is already in create mode, the left panel must not show another create CTA.

If the right panel is in edit mode, the left panel may show a single create CTA that switches the form into create mode.

## Form Modes

The existing shared form panel remains the source of truth for both modes.

### Create Mode

Create mode is active when the owner is adding a new event type.

Rules:

- right-panel heading is `Новый тип события`
- form fields are empty
- primary action label is `Добавить`
- left-panel create CTA is hidden
- delete action is hidden
- archive action is hidden
- status badges tied to an existing event type are hidden
- booking-history and archive banners are hidden

### Edit Mode

Edit mode is active when the owner selects an existing event type from the list.

Rules:

- right-panel heading reflects editing of the selected event type
- form fields are populated from the selected event type
- primary action label is `Сохранить`
- left-panel create CTA is visible as `+ Создать тип события`
- delete or archive actions remain available according to the current business rules
- status badges and restriction banners remain visible when applicable

## Left Panel Behavior

### Empty State

When there are no event types yet:

- the left panel shows only informational empty-state copy
- the separate CTA `Создать первый тип` is removed
- the right panel is immediately shown in create mode

This keeps the screen focused on a single creation path.

### Non-Empty State

When at least one event type exists:

- the list remains visible in the left panel
- the create CTA is shown only in edit mode
- activating the CTA switches the right panel into create mode and clears the current selection

When create mode is active, the create CTA disappears from the left panel until the screen returns to edit mode.

## Primary Action Wording

The primary form button must communicate whether the user is creating a new item or updating an existing one.

Required labels:

- create mode: `Добавить`
- edit mode: `Сохранить`

While a request is pending, the loading text may remain generic if needed, but the idle-state label must depend on the current mode.

## State Matrix

### No Event Types Exist

- left panel: empty-state copy only
- right panel: create mode
- primary button: `Добавить`

### Existing Event Type Selected

- left panel: list plus `+ Создать тип события`
- right panel: edit mode for selected item
- primary button: `Сохранить`

### User Switched To Create Mode

- left panel: list without create CTA
- right panel: empty create form
- primary button: `Добавить`

### New Event Type Successfully Created

After successful creation, the page may continue using the existing behavior:

- the newly created item becomes selected
- the right panel returns to edit mode for that item
- the left-panel create CTA becomes visible again
- the primary button becomes `Сохранить`

This preserves the current post-create workflow while clarifying the action labels.

## Interaction Safety

This change must not alter the following existing behaviors:

- selecting an existing event type enters edit mode
- deleting an unused type is still available only in edit mode
- archiving a used type is still available only in edit mode
- archived and used-state messaging applies only to existing event types

The design intentionally separates visual mode cues from data entry so the shared form component can remain structurally unchanged.

## Testing Impact

Frontend tests for the owner event types page should verify:

- the left-panel create CTA is hidden in create mode
- the empty state does not render `Создать первый тип`
- the primary action reads `Добавить` in create mode
- the primary action reads `Сохранить` in edit mode
- after creating an event type, the page returns to edit mode with the expected controls visible

## Summary

The owner event types screen keeps its existing split layout and shared form panel, but clarifies the two form modes through CTA visibility and button text.

The create flow becomes singular and non-duplicated, while the edit flow retains its current capabilities and destructive actions.