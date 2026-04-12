import { afterEach, describe, expect, it, vi } from "vitest";

import type { CreateBookingRequest } from "../types";

import { cancelBooking, createBooking, getAvailability, listBookings } from "./bookingsApi";

const bookingRequest: CreateBookingRequest = {
  eventTypeId: "standard",
  startAt: "2026-04-15T09:00:00Z",
  endAt: "2026-04-15T09:30:00Z",
  guestName: "Иван Петров",
  guestEmail: "ivan@example.com",
};

describe("bookingsApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("loads bookings from the same-origin API by default", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: "booking-1",
          eventTypeId: "standard",
          startAt: "2026-04-15T09:00:00Z",
          endAt: "2026-04-15T09:30:00Z",
          guestName: "Иван Петров",
          guestEmail: "ivan@example.com",
          status: "active",
        },
      ],
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(listBookings()).resolves.toEqual([
      {
        id: "booking-1",
        eventTypeId: "standard",
        startAt: "2026-04-15T09:00:00Z",
        endAt: "2026-04-15T09:30:00Z",
        guestName: "Иван Петров",
        guestEmail: "ivan@example.com",
        status: "active",
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith("/bookings");
  });

  it("creates bookings with a JSON payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "booking-2",
        ...bookingRequest,
        status: "active",
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(createBooking(bookingRequest)).resolves.toEqual({
      id: "booking-2",
      ...bookingRequest,
      status: "active",
    });
    expect(fetchMock).toHaveBeenCalledWith("/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bookingRequest),
    });
  });

  it("surfaces backend error messages when cancelling a booking", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        text: async () => JSON.stringify({ message: "Booking is already cancelled." }),
      }),
    );

    await expect(cancelBooking("booking-2")).rejects.toThrow("Booking is already cancelled.");
  });

  it("loads availability using the configured API base URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          startAt: "2026-04-15T10:30:00Z",
          endAt: "2026-04-15T11:00:00Z",
        },
      ],
    });

    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");

    await expect(getAvailability("standard")).resolves.toEqual([
      {
        startAt: "2026-04-15T10:30:00Z",
        endAt: "2026-04-15T11:00:00Z",
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/event-types/standard/availability",
    );
  });

  it("rejects malformed booking payloads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ id: "booking-1" }],
      }),
    );

    await expect(listBookings()).rejects.toThrow("Не удалось загрузить бронирования.");
  });
});