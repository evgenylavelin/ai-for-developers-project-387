import type { Booking, EventType, ScheduleDay } from "../types";

export const multiEventTypes: EventType[] = [
  { id: "intro", title: "Короткий созвон", durationMinutes: 15 },
  { id: "standard", title: "Стратегическая сессия", durationMinutes: 30 },
  { id: "deep-dive", title: "Ретроспектива проекта", durationMinutes: 60 },
];

export const singleEventType: EventType[] = [
  { id: "standard", title: "Стратегическая сессия", durationMinutes: 30 },
];

export const noEventTypes: EventType[] = [];

export const bookingSchedule: ScheduleDay[] = [
  {
    isoDate: "2026-04-15",
    weekdayShort: "Ср",
    dayNumber: "15",
    fullLabel: "Среда, 15 апреля",
    slotsByEventType: {
      intro: ["09:00", "09:30", "10:30", "11:00"],
      standard: ["09:00", "10:30", "13:00"],
      "deep-dive": ["09:00", "14:00"],
    },
  },
  {
    isoDate: "2026-04-16",
    weekdayShort: "Чт",
    dayNumber: "16",
    fullLabel: "Четверг, 16 апреля",
    slotsByEventType: {
      intro: ["11:00", "11:30"],
      standard: ["11:00"],
      "deep-dive": ["15:00"],
    },
  },
  {
    isoDate: "2026-04-17",
    weekdayShort: "Пт",
    dayNumber: "17",
    fullLabel: "Пятница, 17 апреля",
    slotsByEventType: {
      intro: ["09:00", "09:30", "16:00"],
      standard: ["09:00", "16:00"],
      "deep-dive": [],
    },
  },
  {
    isoDate: "2026-04-18",
    weekdayShort: "Сб",
    dayNumber: "18",
    fullLabel: "Суббота, 18 апреля",
    slotsByEventType: {
      intro: ["10:00"],
      standard: ["10:00"],
      "deep-dive": ["10:00"],
    },
  },
  {
    isoDate: "2026-04-19",
    weekdayShort: "Вс",
    dayNumber: "19",
    fullLabel: "Воскресенье, 19 апреля",
    slotsByEventType: {
      intro: [],
      standard: [],
      "deep-dive": [],
    },
  },
];

export const publicBookings: Booking[] = [
  {
    id: "booking-1",
    eventTypeId: "standard",
    startAt: "2026-04-15T09:00:00Z",
    endAt: "2026-04-15T09:30:00Z",
    guestName: "Иван Петров",
    guestEmail: "ivan@example.com",
    status: "active",
  },
  {
    id: "booking-2",
    eventTypeId: "intro",
    startAt: "2026-04-15T10:30:00Z",
    endAt: "2026-04-15T10:45:00Z",
    guestName: "Анна Смирнова",
    guestEmail: "anna@example.com",
    status: "active",
  },
  {
    id: "booking-3",
    eventTypeId: "deep-dive",
    startAt: "2026-04-16T15:00:00Z",
    endAt: "2026-04-16T16:00:00Z",
    guestName: "Петр Волков",
    guestEmail: "petr@example.com",
    status: "cancelled",
  },
  {
    id: "booking-4",
    eventTypeId: "standard",
    startAt: "2026-04-17T16:00:00Z",
    endAt: "2026-04-17T16:30:00Z",
    guestName: "Ольга Новикова",
    guestEmail: "olga@example.com",
    status: "active",
  },
];

