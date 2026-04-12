import type {
  AvailabilityByEventType,
  AvailabilitySlot,
  AvailableDatesByEventType,
  SlotDate,
} from "../types";

export type CalendarDay = Omit<SlotDate, "slots">;

const shortWeekdayFormatter = new Intl.DateTimeFormat("ru-RU", {
  weekday: "short",
  timeZone: "UTC",
});

const fullDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, daysToAdd: number): Date {
  const nextDate = new Date(date);

  nextDate.setUTCDate(nextDate.getUTCDate() + daysToAdd);

  return nextDate;
}

function capitalize(value: string): string {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

function createCalendarDay(date: Date): CalendarDay {
  return {
    isoDate: date.toISOString().slice(0, 10),
    weekdayShort: capitalize(shortWeekdayFormatter.format(date).replace(".", "")),
    dayNumber: String(date.getUTCDate()),
    fullLabel: capitalize(fullDateFormatter.format(date)),
  };
}

export function buildPublicCalendarDays(now = new Date()): CalendarDay[] {
  const start = startOfUtcDay(now);

  return Array.from({ length: 14 }, (_, index) => createCalendarDay(addUtcDays(start, index)));
}

export function groupAvailabilityByDate(
  slots: AvailabilitySlot[],
  calendarDays = buildPublicCalendarDays(),
): SlotDate[] {
  const slotsByDate = new Map<string, string[]>();

  slots.forEach((slot) => {
    const isoDate = slot.startAt.slice(0, 10);
    const time = slot.startAt.slice(11, 16);
    const nextTimes = slotsByDate.get(isoDate) ?? [];

    nextTimes.push(time);
    slotsByDate.set(isoDate, nextTimes);
  });

  slotsByDate.forEach((times) => times.sort());

  return calendarDays.map((day) => ({
    ...day,
    slots: slotsByDate.get(day.isoDate) ?? [],
  }));
}

export function buildAvailableDatesFromAvailability(
  availabilityByEventType: AvailabilityByEventType,
  calendarDays = buildPublicCalendarDays(),
): AvailableDatesByEventType {
  return Object.fromEntries(
    Object.entries(availabilityByEventType).map(([eventTypeId, slots]) => [
      eventTypeId,
      groupAvailabilityByDate(slots, calendarDays),
    ]),
  );
}