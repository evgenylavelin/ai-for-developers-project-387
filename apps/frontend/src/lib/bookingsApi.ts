import type { AvailabilitySlot, Booking, CreateBookingRequest } from "../types";

import { buildApiUrl, readApiErrorMessage } from "./apiBase";

const bookingStatuses = new Set(["active", "cancelled"] as const);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBooking(value: unknown): value is Booking {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.eventTypeId === "string" &&
    typeof value.startAt === "string" &&
    typeof value.endAt === "string" &&
    typeof value.guestName === "string" &&
    typeof value.guestEmail === "string" &&
    typeof value.status === "string" &&
    bookingStatuses.has(value.status as Booking["status"])
  );
}

function isAvailabilitySlot(value: unknown): value is AvailabilitySlot {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.startAt === "string" && typeof value.endAt === "string";
}

async function parseJsonResponse<T>(
  response: Response,
  fallbackMessage: string,
  validator: (value: unknown) => value is T,
): Promise<T> {
  const payload = await response.json();

  if (!validator(payload)) {
    throw new Error(fallbackMessage);
  }

  return payload;
}

export async function listBookings(): Promise<Booking[]> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl("/bookings"));
  } catch {
    throw new Error("Не удалось загрузить бронирования.");
  }

  if (!response.ok) {
    const backendMessage = await readApiErrorMessage(response);
    throw new Error(backendMessage ?? "Не удалось загрузить бронирования.");
  }

  const payload = await response.json();

  if (!Array.isArray(payload) || !payload.every(isBooking)) {
    throw new Error("Не удалось загрузить бронирования.");
  }

  return payload;
}

export async function createBooking(booking: CreateBookingRequest): Promise<Booking> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl("/bookings"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(booking),
    });
  } catch {
    throw new Error("Не удалось создать бронирование.");
  }

  if (!response.ok) {
    const backendMessage = await readApiErrorMessage(response);
    throw new Error(backendMessage ?? "Не удалось создать бронирование.");
  }

  return parseJsonResponse(response, "Не удалось создать бронирование.", isBooking);
}

export async function cancelBooking(bookingId: string): Promise<Booking> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl(`/bookings/${bookingId}:cancel`), {
      method: "POST",
    });
  } catch {
    throw new Error("Не удалось отменить бронирование.");
  }

  if (!response.ok) {
    const backendMessage = await readApiErrorMessage(response);
    throw new Error(backendMessage ?? "Не удалось отменить бронирование.");
  }

  return parseJsonResponse(response, "Не удалось отменить бронирование.", isBooking);
}

export async function getAvailability(eventTypeId: string): Promise<AvailabilitySlot[]> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl(`/event-types/${eventTypeId}/availability`));
  } catch {
    throw new Error("Не удалось загрузить доступные слоты.");
  }

  if (!response.ok) {
    const backendMessage = await readApiErrorMessage(response);
    throw new Error(backendMessage ?? "Не удалось загрузить доступные слоты.");
  }

  const payload = await response.json();

  if (!Array.isArray(payload) || !payload.every(isAvailabilitySlot)) {
    throw new Error("Не удалось загрузить доступные слоты.");
  }

  return payload;
}