import { describe, expect, it } from "vitest";

import { bookingSchedule, multiEventTypes, publicBookings } from "../data/mockGuestFlow";
import {
  ALL_EVENT_TYPES_FILTER,
  buildAvailableDatesFromSchedule,
  buildCalendarDaySummaries,
  cancelPublicBooking,
  getInitialSelectedDate,
  listBookingsForDate,
} from "./publicBookings";

describe("buildAvailableDatesFromSchedule", () => {
  it("removes active booking slots from event-type availability", () => {
    const datesByEventType = buildAvailableDatesFromSchedule(
      bookingSchedule,
      multiEventTypes,
      publicBookings,
    );

    expect(datesByEventType.standard[0].slots).toEqual(["10:30", "13:00"]);
    expect(datesByEventType.intro[0].slots).toEqual(["09:00", "09:30", "11:00"]);
  });

  it("keeps cancelled booking slots available", () => {
    const datesByEventType = buildAvailableDatesFromSchedule(
      bookingSchedule,
      multiEventTypes,
      publicBookings,
    );

    expect(datesByEventType["deep-dive"][1].slots).toEqual(["15:00"]);
  });
});

describe("buildCalendarDaySummaries", () => {
  it("shows only booked counts in all mode", () => {
    const datesByEventType = buildAvailableDatesFromSchedule(
      bookingSchedule,
      multiEventTypes,
      publicBookings,
    );

    expect(
      buildCalendarDaySummaries(
        bookingSchedule,
        publicBookings,
        datesByEventType,
        ALL_EVENT_TYPES_FILTER,
      )[0],
    ).toMatchObject({
      isoDate: "2026-04-15",
      bookedCount: 2,
      freeCount: undefined,
    });
  });

  it("shows booked and free counts for a specific event type", () => {
    const datesByEventType = buildAvailableDatesFromSchedule(
      bookingSchedule,
      multiEventTypes,
      publicBookings,
    );

    expect(
      buildCalendarDaySummaries(bookingSchedule, publicBookings, datesByEventType, "standard")[0],
    ).toMatchObject({
      isoDate: "2026-04-15",
      bookedCount: 1,
      freeCount: 2,
    });
  });
});

describe("listBookingsForDate", () => {
  it("returns all bookings for the selected day, including cancelled ones", () => {
    expect(listBookingsForDate(publicBookings, "2026-04-16")).toEqual([publicBookings[2]]);
  });
});

describe("getInitialSelectedDate", () => {
  it("starts from the first booking date when bookings exist", () => {
    expect(getInitialSelectedDate(bookingSchedule, publicBookings)).toBe("2026-04-15");
  });
});

describe("cancelPublicBooking", () => {
  it("marks active bookings as cancelled without removing them", () => {
    const nextBookings = cancelPublicBooking(publicBookings, "booking-1");

    expect(nextBookings[0].status).toBe("cancelled");
    expect(nextBookings).toHaveLength(publicBookings.length);
  });
});