import type {
  AvailableDatesByEventType,
  Booking,
  CalendarDaySummary,
  EventType,
  ScheduleDay,
} from "../types";

import type { CalendarDay } from "./publicCalendar";

export const ALL_EVENT_TYPES_FILTER = "all";

function getBookingDate(booking: Booking): string {
  return booking.startAt.slice(0, 10);
}

function getBookingTime(booking: Booking): string {
  return booking.startAt.slice(11, 16);
}

function getBookingEndTime(booking: Booking): string {
  return booking.endAt.slice(11, 16);
}

function getActiveIntervalKeys(bookings: Booking[]): Set<string> {
  return new Set(
    bookings
      .filter((booking) => booking.status === "active")
      .map(
        (booking) =>
          `${getBookingDate(booking)}|${getBookingTime(booking)}|${getBookingEndTime(booking)}`,
      ),
  );
}

function toSlotDate(day: ScheduleDay, slots: string[]) {
  return {
    isoDate: day.isoDate,
    weekdayShort: day.weekdayShort,
    dayNumber: day.dayNumber,
    fullLabel: day.fullLabel,
    slots,
  };
}

export function buildAvailableDatesFromSchedule(
  schedule: ScheduleDay[],
  eventTypes: EventType[],
  bookings: Booking[],
): AvailableDatesByEventType {
  const activeIntervalKeys = getActiveIntervalKeys(bookings);

  return Object.fromEntries(
    eventTypes.map((eventType) => [
      eventType.id,
      schedule.map((day) =>
        toSlotDate(
          day,
          (day.slotsByEventType[eventType.id] ?? []).filter(
            (slot) =>
              !activeIntervalKeys.has(
                `${day.isoDate}|${slot}|${addMinutes(slot, eventType.durationMinutes)}`,
              ),
          ),
        ),
      ),
    ]),
  );
}

export function buildCalendarDaySummaries(
  calendarDays: CalendarDay[],
  bookings: Booking[],
  availableDatesByEventType: AvailableDatesByEventType,
  selectedFilterId: string,
): CalendarDaySummary[] {
  return calendarDays.map((day) => {
    const activeBookings = bookings.filter(
      (booking) => booking.status === "active" && getBookingDate(booking) === day.isoDate,
    );
    const bookedCount =
      selectedFilterId === ALL_EVENT_TYPES_FILTER
        ? activeBookings.length
        : activeBookings.filter((booking) => booking.eventTypeId === selectedFilterId).length;
    const freeCount =
      selectedFilterId === ALL_EVENT_TYPES_FILTER
        ? undefined
        : (availableDatesByEventType[selectedFilterId] ?? []).find(
            (slotDate) => slotDate.isoDate === day.isoDate,
          )?.slots.length ?? 0;

    return {
      isoDate: day.isoDate,
      weekdayShort: day.weekdayShort,
      dayNumber: day.dayNumber,
      fullLabel: day.fullLabel,
      bookedCount,
      freeCount,
    };
  });
}

export function listBookingsForDate(bookings: Booking[], isoDate: string): Booking[] {
  return bookings
    .filter((booking) => getBookingDate(booking) === isoDate)
    .slice()
    .sort((left, right) => left.startAt.localeCompare(right.startAt));
}

export function getInitialSelectedDate(calendarDays: CalendarDay[], bookings: Booking[]): string {
  const firstBookingDate = bookings[0] ? getBookingDate(bookings[0]) : "";

  if (firstBookingDate && calendarDays.some((day) => day.isoDate === firstBookingDate)) {
    return firstBookingDate;
  }

  return calendarDays[0]?.isoDate ?? "";
}

export function cancelPublicBooking(bookings: Booking[], bookingId: string): Booking[] {
  return bookings.map((booking) =>
    booking.id === bookingId && booking.status === "active"
      ? { ...booking, status: "cancelled" }
      : booking,
  );
}

function addMinutes(time: string, minutesToAdd: number): string {
  const [hours, minutes] = time.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + minutesToAdd;
  const endHours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const endMinutes = (totalMinutes % 60).toString().padStart(2, "0");

  return `${endHours}:${endMinutes}`;
}