import { describe, expect, it } from "vitest";

import { buildProgressSteps, deriveEntryState, formatSummary } from "./guestFlow";
import {
  bookingSchedule,
  multiEventTypes,
  noEventTypes,
  singleEventType,
} from "../data/mockGuestFlow";
import { buildAvailableDatesByEventType } from "./publicBookings";

describe("deriveEntryState", () => {
  it("returns unavailable for zero event types", () => {
    expect(deriveEntryState(noEventTypes).kind).toBe("unavailable");
  });

  it("returns direct-booking for one event type", () => {
    const state = deriveEntryState(singleEventType);

    expect(state.kind).toBe("direct-booking");
    if (state.kind === "direct-booking") {
      expect(state.presetEventType).toEqual(singleEventType[0]);
    }
  });

  it("returns choose-event-type for multiple event types", () => {
    expect(deriveEntryState(multiEventTypes).kind).toBe("choose-event-type");
  });
});

describe("buildProgressSteps", () => {
  it("returns no steps for unavailable entry", () => {
    expect(buildProgressSteps(deriveEntryState(noEventTypes).kind)).toEqual([]);
  });

  it("omits event type step for direct booking", () => {
    expect(buildProgressSteps(deriveEntryState(singleEventType).kind)).toEqual([
      "Дата и время",
      "Контакты",
    ]);
  });

  it("includes the event type step when multiple event types exist", () => {
    expect(buildProgressSteps(deriveEntryState(multiEventTypes).kind)).toEqual([
      "Тип встречи",
      "Дата и время",
      "Контакты",
    ]);
  });
});

describe("formatSummary", () => {
  it("formats event type, full date, and time in one line", () => {
    expect(
      formatSummary({
        eventTypeTitle: "Стратегическая сессия",
        fullDateLabel: "Среда, 15 апреля",
        timeLabel: "10:30",
      }),
    ).toBe("Стратегическая сессия • Среда, 15 апреля • 10:30");
  });

  it("omits missing summary parts without extra separators", () => {
    expect(
      formatSummary({
        eventTypeTitle: "Стратегическая сессия",
        timeLabel: "10:30",
      }),
    ).toBe("Стратегическая сессия • 10:30");
  });

  it("returns the single available part when others are missing", () => {
    expect(
      formatSummary({
        fullDateLabel: "Среда, 15 апреля",
      }),
    ).toBe("Среда, 15 апреля");
  });

  it("returns an empty string for a blank summary", () => {
    expect(formatSummary({})).toBe("");
  });
});

describe("mock guest flow fixtures", () => {
  it("exposes the expected entry-state fixture shapes", () => {
    expect(noEventTypes).toEqual([]);
    expect(singleEventType).toHaveLength(1);
    expect(multiEventTypes).toHaveLength(3);
  });

  it("exposes schedule days and derived direct-booking slots", () => {
    const datesByEventType = buildAvailableDatesByEventType(bookingSchedule, singleEventType, []);

    expect(bookingSchedule).toHaveLength(5);
    expect(datesByEventType.standard[0]).toMatchObject({
      isoDate: "2026-04-15",
      weekdayShort: "Ср",
      dayNumber: "15",
      fullLabel: "Среда, 15 апреля",
    });
    expect(datesByEventType.standard[0].slots).toEqual(["09:00", "10:30", "13:00"]);
    expect(datesByEventType.standard[4].slots).toEqual([]);
  });
});
