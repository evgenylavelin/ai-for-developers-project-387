# Guest Flow UI Design For Call Calendar

## Goal

Define the UX and UI behavior for the guest booking flow of the future frontend application.

This design covers only the guest-facing booking experience. It does not define owner screens or implementation details.

The flow must stay maximally simple, preserve the product constraints from `README.md`, and reflect the API-first approach already established in `spec/`.

## Scope

This design covers:

- guest entry states before booking starts
- guest wizard structure
- progress indication
- step content and behavior
- selected-value summary behavior between steps
- empty, error, and success states
- visual tone and layout direction

This design does not cover:

- owner UI
- backend implementation
- frontend routing details
- visual branding system beyond the chosen UI direction
- authentication or account management

## Design Principles

- The interface stays linear and focused: one screen presents one main decision.
- The flow should never show steps that the user does not need to complete.
- Previous selections remain visible on later steps so the user keeps context without navigating back.
- The UI remains utilitarian and quiet rather than expressive or decorative.
- Booking-specific empty states should explain availability clearly instead of leaving blank areas.

## Chosen UI Direction

The approved direction for the guest flow is:

- layout style: `linear focus`
- wizard length: dynamic, based on available event types
- progress pattern: segmented progress with step labels
- visual tone: `highly utilitarian`
- slot-selection layout: `vertical stack`
- date presentation: hybrid day-of-week format

Implications:

- The main content column remains visually dominant.
- There is no sidebar progress or dashboard-style layout.
- The date/time step shows calendar selection first and available times below it.
- Days in the calendar show abbreviated weekday plus date.
- The selected date above the slot list shows the full weekday and full date.

## Entry States

The guest flow has three entry states depending on the number of available event types.

### Zero Event Types

If no event types are available, the booking wizard does not start.

The screen shows a dedicated empty state:

- title: `Запись пока недоступна`
- message: `Организатор еще не настроил доступные встречи. Попробуйте зайти позже.`

Rules:

- no progress indicator
- no disabled wizard shell
- no empty first step

### One Event Type

If exactly one event type is available, the flow skips the event-type selection step.

The guest lands directly on the `Date and Time` step.

Rules:

- the single event type is treated as already selected
- the selected type appears in the summary block on subsequent screens
- the event type is displayed as read-only context, not as a tappable choice
- progress becomes a two-step flow:
  - `Дата и время`
  - `Контакты`

### Two Or More Event Types

If two or more event types are available, the guest sees the full wizard:

1. `Тип встречи`
2. `Дата и время`
3. `Контакты`

## Progress Pattern

Progress is shown as compact labeled segments above the active step.

Rules:

- each segment has a short step label
- completed and active steps are visually distinct from upcoming steps
- the component reflects only the steps that actually exist in the current flow
- the component is hidden entirely for the zero-event-type empty state

Behavior:

- for the three-step flow, segments are:
  - `Тип встречи`
  - `Дата и время`
  - `Контакты`
- for the two-step flow, segments are:
  - `Дата и время`
  - `Контакты`

## Wizard Layout

Each wizard screen follows the same structure:

- progress segments
- compact summary of previously selected values, when applicable
- main step heading
- one-line supporting text
- primary interaction area
- bottom navigation actions

Layout rules:

- avoid sidebars and secondary columns for the main flow structure
- keep the active interaction area visually dominant
- use concise headings and short descriptions
- use cards, tiles, and buttons with restrained styling

## Selection Summary

All later steps must show the values already selected on earlier steps.

The summary appears as a compact row of values or neutral chips above the active step heading.

Rules:

- no extra label such as `Вы выбрали`
- no fake affordance or link-like styling
- the block stays compact and secondary to the main task
- the summary is read-only in the skipped-step scenario

Content rules:

- after `Тип встречи`, summary shows the selected event type
- after `Дата и время`, summary shows:
  - event type
  - weekday and full date
  - time

Examples:

- `30 минут`
- `30 минут • Среда, 15 апреля • 10:30`

## Step Definitions

### Step 1: Event Type

This step exists only when two or more event types are available.

Content:

- heading such as `Выберите тип встречи`
- very short supporting line
- list of selectable event-type cards

Card content:

- event type title
- duration
- optional one-line note if the product actually has one

Behavior:

- only one event type can be selected
- `Далее` remains disabled until a selection is made
- the chosen value appears in summary on the next step

### Step 2: Date and Time

This is the core screen of the flow.

Chosen layout: `vertical stack`

Structure:

- compact summary of prior selection
- step heading and short help text
- calendar block
- full selected date line
- list or grid of available slots for the chosen date

Date presentation:

- calendar cells show abbreviated weekday and date number, for example:
  - `Ср`
  - `15`
- the slot area header shows the full selected date, for example:
  - `Среда, 15 апреля`

Behavior:

- only dates inside the 14-day booking window are shown
- unavailable dates are visually distinct from selectable dates
- choosing a date updates the slot list below
- choosing a slot enables `Далее`

If the flow started with one event type:

- the event type is already present in summary
- there is no separate first-step interaction

### Step 3: Contacts

This is the final data-entry step.

Content:

- summary including event type, date, and time
- heading for contact entry
- minimal form
- confirmation action

Base fields:

- `Имя`
- `Email`

Optional fields:

- phone or comment only if they are explicitly required by product scope later

Behavior:

- the primary action is `Подтвердить`
- the step should feel short and lightweight

## Empty And Status States

The flow needs explicit states for clarity.

### No Event Types

Dedicated empty screen before the wizard starts.

### No Slots For Selected Date

If a chosen date has no available slots, the slot area shows a clear empty state instead of an empty container.

The message should explain that no time is available for the selected day and prompt the user to choose another date.

### Form Submission Error

If booking submission fails, the contacts step should show an inline error state without losing the chosen slot context.

### Successful Booking

Success should be shown as a separate confirmation screen rather than a small inline success notice inside the form.

The success screen should repeat the confirmed booking details:

- event type
- weekday and full date
- time

## Content Tone

The wording should match the chosen utilitarian direction.

Rules:

- concise and neutral
- no playful marketing tone
- no unnecessary helper copy
- direct action labels

Examples of tone:

- `Выберите тип встречи`
- `Выберите дату и время`
- `Введите контактные данные`
- `Запись пока недоступна`

## Behavioral Summary

Final UX behavior:

- `0 event types` -> show unavailable empty state
- `1 event type` -> start from `Date and Time` with read-only event-type summary
- `2+ event types` -> start from `Event Type`
- later steps always display previously selected values
- summary has no heading and is never interactive in skipped-step mode
- progress reflects only the steps present in the current flow
- date/time uses compact weekday display in the calendar and full weekday display near slot selection

## Open Implementation Notes

These notes are constraints for future implementation, not design extensions:

- frontend behavior must stay consistent with the contract-driven product rules
- the 14-day window must remain visible in the booking UI
- the UI must not imply registration, authentication, or extra user roles
- the UI must not allow booking logic not supported by the contract
