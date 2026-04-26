import { describe, expect, it } from "vitest";

import {
  createEmptyOwnerSchedule,
  timeSlotOptions,
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

  describe("timeSlotOptions", () => {
    it("contains 48 half-hour slots from 00:00 to 23:30", () => {
      expect(timeSlotOptions).toHaveLength(48);
      expect(timeSlotOptions[0]).toBe("00:00");
      expect(timeSlotOptions[47]).toBe("23:30");
    });

    it("includes common working hours in 24-hour format", () => {
      expect(timeSlotOptions).toContain("09:00");
      expect(timeSlotOptions).toContain("18:00");
    });

    it("never contains AM or PM suffixes", () => {
      for (const slot of timeSlotOptions) {
        expect(slot).not.toMatch(/AM|PM/i);
        expect(slot).toMatch(/^\d{2}:\d{2}$/);
      }
    });
  });
});
