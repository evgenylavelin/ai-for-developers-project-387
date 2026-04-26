import { describe, expect, it } from "vitest";

import {
  createEmptyOwnerSchedule,
  toggleWorkingDay,
  validateOwnerScheduleForm,
  weekdayOptions,
} from "./ownerSchedule";

describe("ownerSchedule helpers", () => {
  it("exposes weekday metadata in calendar order", () => {
    expect(weekdayOptions.map((weekday) => weekday.value)).toEqual([
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ]);
  });

  it("toggles working days and keeps them ordered", () => {
    const monday = toggleWorkingDay(createEmptyOwnerSchedule(), "monday");
    const mondayWednesday = toggleWorkingDay(monday, "wednesday");
    const removedMonday = toggleWorkingDay(mondayWednesday, "monday");

    expect(monday).toEqual({
      workingDays: ["monday"],
      startTime: "",
      endTime: "",
    });
    expect(mondayWednesday.workingDays).toEqual(["monday", "wednesday"]);
    expect(removedMonday.workingDays).toEqual(["wednesday"]);
  });

  it("requires at least one working day", () => {
    expect(
      validateOwnerScheduleForm({
        workingDays: [],
        startTime: "09:00",
        endTime: "18:00",
      }),
    ).toBe("Выберите хотя бы один рабочий день.");
  });

  it("requires both start and end times", () => {
    expect(
      validateOwnerScheduleForm({
        workingDays: ["monday"],
        startTime: "",
        endTime: "18:00",
      }),
    ).toBe("Укажите время начала и окончания.");

    expect(
      validateOwnerScheduleForm({
        workingDays: ["monday"],
        startTime: "09:00",
        endTime: "",
      }),
    ).toBe("Укажите время начала и окончания.");
  });

  it("requires the start time to be earlier than the end time", () => {
    expect(
      validateOwnerScheduleForm({
        workingDays: ["monday"],
        startTime: "18:00",
        endTime: "09:00",
      }),
    ).toBe("Время начала должно быть раньше времени окончания.");

    expect(
      validateOwnerScheduleForm({
        workingDays: ["monday"],
        startTime: "09:00",
        endTime: "09:00",
      }),
    ).toBe("Время начала должно быть раньше времени окончания.");
  });

  it("accepts a complete owner schedule", () => {
    expect(
      validateOwnerScheduleForm({
        workingDays: ["monday", "wednesday"],
        startTime: "09:00",
        endTime: "18:00",
      }),
    ).toBe("");
  });
});
