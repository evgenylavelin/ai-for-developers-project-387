import type { EventType, SlotDate } from "../types";

export const multiEventTypes: EventType[] = [
  { id: "intro", title: "15 минут", durationMinutes: 15 },
  { id: "standard", title: "30 минут", durationMinutes: 30 },
  { id: "deep-dive", title: "60 минут", durationMinutes: 60 },
];

export const singleEventType: EventType[] = [
  { id: "standard", title: "30 минут", durationMinutes: 30 },
];

export const noEventTypes: EventType[] = [];

export const slotDates: SlotDate[] = [
  {
    isoDate: "2026-04-15",
    weekdayShort: "Ср",
    dayNumber: "15",
    fullLabel: "Среда, 15 апреля",
    slots: ["09:00", "10:30", "13:00", "16:30"],
  },
  {
    isoDate: "2026-04-16",
    weekdayShort: "Чт",
    dayNumber: "16",
    fullLabel: "Четверг, 16 апреля",
    slots: [],
  },
];

