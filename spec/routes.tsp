import "@typespec/http";

using Http;

namespace CallPlanner;

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

@route("/event-types")
@tag("Event Types")
interface EventTypes {
  /**
   * Guest-facing and owner-facing operation.
   * Returns the list of bookable event types.
   */
  @get
  list(): EventTypeListResponse;

  /**
   * Guest-facing operation.
   * Returns only free slots for the selected event type during the next 14 days.
   * Returned slots are already aligned to the event type duration.
   */
  @get
  @route("/{eventTypeId}/availability")
  getAvailability(@path eventTypeId: string): AvailabilityResponse | NotFoundError;
}

@route("/owner/event-types")
@tag("Owner Event Types")
interface OwnerEventTypes {
  /**
   * Owner-facing operation.
   * Returns all event types, including archived ones and booking metadata.
   */
  @get
  list(): OwnerEventTypeListResponse;

  /**
   * Owner-facing operation.
   * Creates a new event type with a positive duration.
   */
  @post
  create(@body body: CreateEventTypeRequest): EventTypeCreatedResponse | BadRequestError;

  /**
   * Owner-facing operation.
   * Updates an existing event type.
   */
  @patch
  @route("/{eventTypeId}")
  update(
    @path eventTypeId: string,
    @body body: UpdateEventTypeRequest,
  ): OwnerEventTypeResponse | BadRequestError | NotFoundError | ConflictError;

  /**
   * Owner-facing operation.
   * Archives an event type without deleting existing bookings.
   */
  @post
  @route("/{eventTypeId}:archive")
  archive(@path eventTypeId: string): OwnerEventTypeResponse | NotFoundError | ConflictError;

  /**
   * Owner-facing operation.
   * Deletes an event type when no constraints prevent removal.
   */
  @delete
  @route("/{eventTypeId}")
  delete(@path eventTypeId: string): NoContentResponse | NotFoundError | ConflictError;
}

@route("/bookings")
@tag("Bookings")
interface Bookings {
  /**
   * Guest-facing operation.
   * Creates a booking for a free interval that matches the selected event type duration.
   * The same interval cannot be booked twice, even across different event types.
   */
  @post
  create(
    @body body: CreateBookingRequest,
  ): BookingCreatedResponse | BadRequestError | NotFoundError | ConflictError;

  /**
   * Public operation for the educational MVP.
   * Returns the full booking history, including both active and cancelled bookings.
   */
  @get
  list(): BookingListResponse;

  /**
   * Public operation for the educational MVP.
   * Changes the booking status to cancelled instead of deleting the booking.
   * Any visitor may cancel any active booking, and cancelling a booking makes its interval available again.
   */
  @post
  @route("/{bookingId}:cancel")
  cancel(@path bookingId: string): BookingResponse | NotFoundError | ConflictError;
}
