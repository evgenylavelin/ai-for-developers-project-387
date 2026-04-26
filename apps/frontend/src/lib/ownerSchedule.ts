import type { DayOfWeek, OwnerSchedule } from "../types";

export type WeekdayOption = {
  value: DayOfWeek;
  label: string;
  shortLabel: string;
};

export const weekdayMetadata: WeekdayOption[] = [
  { value: "monday", label: "Понедельник", shortLabel: "Пн" },
  { value: "tuesday", label: "Вторник", shortLabel: "Вт" },
  { value: "wednesday", label: "Среда", shortLabel: "Ср" },
  { value: "thursday", label: "Четверг", shortLabel: "Чт" },
  { value: "friday", label: "Пятница", shortLabel: "Пт" },
  { value: "saturday", label: "Суббота", shortLabel: "Сб" },
  { value: "sunday", label: "Воскресенье", shortLabel: "Вс" },
];

export const weekdayOptions = weekdayMetadata;

const weekdayOrder = new Map(weekdayMetadata.map((weekday, index) => [weekday.value, index]));

export function createEmptyOwnerSchedule(): OwnerSchedule {
  return {
    workingDays: [],
    startTime: "",
    endTime: "",
  };
}

export function toggleWorkingDay(schedule: OwnerSchedule, day: DayOfWeek): OwnerSchedule {
  const nextWorkingDays = schedule.workingDays.includes(day)
    ? schedule.workingDays.filter((workingDay) => workingDay !== day)
    : [...schedule.workingDays, day];

  return {
    ...schedule,
    workingDays: nextWorkingDays.slice().sort((left, right) => {
      return (weekdayOrder.get(left) ?? 0) - (weekdayOrder.get(right) ?? 0);
    }),
  };
}

export function validateOwnerScheduleForm(schedule: OwnerSchedule): string {
  if (schedule.workingDays.length === 0) {
    return "Выберите хотя бы один рабочий день.";
  }

  if (!schedule.startTime || !schedule.endTime) {
    return "Укажите время начала и окончания.";
  }

  if (schedule.startTime >= schedule.endTime) {
    return "Время начала должно быть раньше времени окончания.";
  }

  return "";
}
