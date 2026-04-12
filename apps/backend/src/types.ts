export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type OwnerSchedule = {
  workingDays: DayOfWeek[];
  startTime: string;
  endTime: string;
};

export type EventType = {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
};

export type StoredEventType = {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  isArchived: boolean;
};

export type OwnerEventType = StoredEventType & {
  hasBookings: boolean;
};

export type BookingStatus = "active" | "cancelled";

export type Booking = {
  id: string;
  eventTypeId: string;
  startAt: string;
  endAt: string;
  guestName: string;
  guestEmail: string;
  status: BookingStatus;
};

export type CreateEventTypeInput = {
  title: string;
  description?: string;
  durationMinutes: number;
};

export type CreateBookingInput = {
  eventTypeId: string;
  startAt: string;
  endAt: string;
  guestName: string;
  guestEmail: string;
};

export const defaultSchedule: OwnerSchedule = {
  workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  startTime: "09:00",
  endTime: "18:00",
};
