import type { OwnerEventType } from "../types";

export const mockOwnerEventTypes: OwnerEventType[] = [
  {
    id: "strategy",
    title: "Стратегическая сессия",
    description: "Разбор текущей ситуации, целей на квартал и следующих шагов.",
    durationMinutes: 60,
    isArchived: false,
    hasBookings: true,
  },
  {
    id: "sync",
    title: "Короткий созвон",
    description: "Быстро сверяем контекст, блокеры и решения по текущей задаче.",
    durationMinutes: 20,
    isArchived: false,
    hasBookings: false,
  },
  {
    id: "retrospective",
    title: "Ретроспектива проекта",
    description: "Формат для разбора завершенного этапа и фиксации выводов.",
    durationMinutes: 45,
    isArchived: true,
    hasBookings: true,
  },
];
