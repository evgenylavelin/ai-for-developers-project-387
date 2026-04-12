export type EventType = {
  id: string;
  title: string;
  durationMinutes: number;
  description?: string;
};

export type OwnerEventType = {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  isArchived: boolean;
  hasBookings: boolean;
};

export type OwnerEventTypeForm = {
  title: string;
  description: string;
  durationMinutes: string;
};

export type OwnerEventTypeInput = {
  title: string;
  description?: string;
  durationMinutes: number;
};

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

export type Workspace = "public" | "owner-event-types" | "owner-settings";

export type ScheduleDay = {
  isoDate: string;
  weekdayShort: string;
  dayNumber: string;
  fullLabel: string;
  slotsByEventType: Record<string, string[]>;
};

export type SlotDate = {
  isoDate: string;
  weekdayShort: string;
  dayNumber: string;
  fullLabel: string;
  slots: string[];
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

export type BookingDraft = {
  eventTypeId: string;
  isoDate: string;
  time: string;
  guestName: string;
  guestEmail: string;
};

export type CreateBookingRequest = {
  eventTypeId: string;
  startAt: string;
  endAt: string;
  guestName: string;
  guestEmail: string;
};

export type AvailabilitySlot = {
  startAt: string;
  endAt: string;
};

export type AvailabilityByEventType = Record<string, AvailabilitySlot[]>;

export type AvailableDatesByEventType = Record<string, SlotDate[]>;

export type CalendarDaySummary = {
  isoDate: string;
  weekdayShort: string;
  dayNumber: string;
  fullLabel: string;
  bookedCount: number;
  freeCount?: number;
};

export type EntryStateKind =
  | "unavailable"
  | "direct-booking"
  | "choose-event-type";

export type UnavailableEntryState = {
  kind: "unavailable";
};

export type DirectBookingEntryState = {
  kind: "direct-booking";
  presetEventType: EventType;
};

export type ChooseEventTypeEntryState = {
  kind: "choose-event-type";
};

export type EntryState =
  | UnavailableEntryState
  | DirectBookingEntryState
  | ChooseEventTypeEntryState;

export type GuestFlowSummary = {
  eventTypeTitle?: string;
  fullDateLabel?: string;
  timeLabel?: string;
};
