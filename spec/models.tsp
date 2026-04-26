import "@typespec/http";

using Http;

namespace CallPlanner;

enum BookingStatus {
  active,
  cancelled,
}

enum DayOfWeek {
  monday,
  tuesday,
  wednesday,
  thursday,
  friday,
  saturday,
  sunday,
}

model Schedule {
  workingDays: DayOfWeek[];
  startTime: string;
  endTime: string;
}

model UpdateScheduleRequest {
  workingDays: DayOfWeek[];
  startTime: string;
  endTime: string;
}

model ScheduleResponse {
  @statusCode
  statusCode: 200;

  @body
  body: Schedule;
}

model UpdateScheduleResponse {
  @statusCode
  statusCode: 200;

  @body
  body: Schedule;
}

model EventType {
  id: string;
  title: string;
  description?: string;
  @minValue(1)
  @maxValue(360)
  durationMinutes: int32;
}

model OwnerEventType {
  id: string;
  title: string;
  description?: string;
  @minValue(1)
  @maxValue(360)
  durationMinutes: int32;
  isArchived: boolean;
  hasBookings: boolean;
}

model AvailableSlot {
  startAt: utcDateTime;
  endAt: utcDateTime;
}

model Booking {
  id: string;
  eventTypeId: string;
  startAt: utcDateTime;
  endAt: utcDateTime;
  guestName: string;
  @pattern("^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?!\\.)([a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}$")
  guestEmail: string;
  status: BookingStatus;
}

model CreateEventTypeRequest {
  title: string;
  description?: string;
  @minValue(1)
  @maxValue(360)
  durationMinutes: int32;
}

model UpdateEventTypeRequest {
  title: string;
  description?: string;
  @minValue(1)
  @maxValue(360)
  durationMinutes: int32;
}

model CreateBookingRequest {
  eventTypeId: string;
  startAt: utcDateTime;
  endAt: utcDateTime;
  guestName: string;
  @pattern("^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?!\\.)([a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}$")
  guestEmail: string;
}

model EventTypeCreatedResponse {
  @statusCode
  statusCode: 201;

  @body
  body: EventType;
}

model EventTypeListResponse {
  @statusCode
  statusCode: 200;

  @body
  body: EventType[];
}

model OwnerEventTypeListResponse {
  @statusCode
  statusCode: 200;

  @body
  body: OwnerEventType[];
}

model OwnerEventTypeResponse {
  @statusCode
  statusCode: 200;

  @body
  body: OwnerEventType;
}

model AvailabilityResponse {
  @statusCode
  statusCode: 200;

  @body
  body: AvailableSlot[];
}

model BookingCreatedResponse {
  @statusCode
  statusCode: 201;

  @body
  body: Booking;
}

model BookingListResponse {
  @statusCode
  statusCode: 200;

  @body
  body: Booking[];
}

model BookingResponse {
  @statusCode
  statusCode: 200;

  @body
  body: Booking;
}

model NoContentResponse {
  @statusCode
  statusCode: 204;
}
