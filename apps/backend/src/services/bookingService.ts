import { randomUUID } from "node:crypto";

import { AppError } from "../lib/errors.js";
import { isValidEmail } from "../lib/validation.js";
import {
  addMinutes,
  bookingWindowEnd,
  differenceInMinutes,
  setUtcTime,
  weekday,
} from "../lib/time.js";
import { InMemoryBookingRepository } from "../repositories/inMemoryBookingRepository.js";
import { InMemoryEventTypeRepository } from "../repositories/inMemoryEventTypeRepository.js";
import { InMemoryScheduleRepository } from "../repositories/inMemoryScheduleRepository.js";
import type { Booking, CreateBookingInput, OwnerSchedule } from "../types.js";

const activeBookingStatus = "active" as const;
const cancelledBookingStatus = "cancelled" as const;

export class BookingService {
  constructor(
    private readonly bookingRepository: InMemoryBookingRepository,
    private readonly eventTypeRepository: InMemoryEventTypeRepository,
    private readonly scheduleRepository: InMemoryScheduleRepository,
  ) {}

  listBookings() {
    return this.bookingRepository.list();
  }

  getAvailability(eventTypeId: string, now = new Date()) {
    const eventType = this.getBookableEventType(eventTypeId);

    const schedule = this.scheduleRepository.get();
    const windowEnd = bookingWindowEnd(now);
    const activeBookings = this.bookingRepository
      .list()
      .filter((booking) => booking.status === activeBookingStatus);
    const availability: Array<{ startAt: string; endAt: string }> = [];

    for (let dayCursor = startOfUtcDay(now); dayCursor < windowEnd; dayCursor = addMinutes(dayCursor, 24 * 60)) {
      if (!schedule.workingDays.includes(weekday(dayCursor))) {
        continue;
      }

      const scheduleStart = setUtcTime(dayCursor, schedule.startTime);
      const scheduleEnd = setUtcTime(dayCursor, schedule.endTime);

      for (
        let slotStart = new Date(scheduleStart);
        slotStart < scheduleEnd;
        slotStart = addMinutes(slotStart, eventType.durationMinutes)
      ) {
        const slotEnd = addMinutes(slotStart, eventType.durationMinutes);

        if (slotStart < now) {
          continue;
        }

        if (slotEnd > windowEnd) {
          break;
        }

        if (slotEnd > scheduleEnd) {
          break;
        }

        if (activeBookings.some((booking) => intervalsOverlap(slotStart, slotEnd, new Date(booking.startAt), new Date(booking.endAt)))) {
          continue;
        }

        availability.push({
          startAt: slotStart.toISOString(),
          endAt: slotEnd.toISOString(),
        });
      }
    }

    return availability;
  }

  createBooking(input: unknown, now = new Date()) {
    const payload = toCreateBookingInput(input);
    const { startAt, endAt } = parseBookingTimestamps(payload.startAt, payload.endAt);

    const eventType = this.getBookableEventType(payload.eventTypeId);

    if (differenceInMinutes(endAt, startAt) !== eventType.durationMinutes) {
      throw new AppError(409, "conflict", "The selected slot does not match the event duration.");
    }

    const windowEnd = bookingWindowEnd(now);

    if (startAt < now || startAt >= windowEnd || endAt > windowEnd) {
      throw new AppError(409, "conflict", "The selected slot is outside the 14-day booking window.");
    }

    if (!matchesSchedule(this.scheduleRepository.get(), startAt, endAt, eventType.durationMinutes)) {
      throw new AppError(409, "conflict", "The selected slot is outside the owner schedule.");
    }

    if (this.hasActiveConflict(startAt, endAt)) {
      throw new AppError(409, "conflict", "The selected slot is no longer available.");
    }

    return this.bookingRepository.save({
      id: randomUUID(),
      eventTypeId: payload.eventTypeId,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      guestName: payload.guestName,
      guestEmail: payload.guestEmail,
      status: activeBookingStatus,
    });
  }

  cancelBooking(bookingId: string) {
    const booking = this.bookingRepository.get(bookingId);

    if (!booking) {
      throw new AppError(404, "not_found", "Booking not found.");
    }

    if (booking.status === cancelledBookingStatus) {
      throw new AppError(409, "conflict", "Booking is already cancelled.");
    }

    return this.bookingRepository.save({
      ...booking,
      status: cancelledBookingStatus,
    });
  }

  private hasActiveConflict(startAt: Date, endAt: Date) {
    return this.bookingRepository
      .list()
      .some(
        (booking) =>
          booking.status === activeBookingStatus &&
          intervalsOverlap(startAt, endAt, new Date(booking.startAt), new Date(booking.endAt)),
      );
  }

  private getBookableEventType(eventTypeId: string) {
    const eventType = this.eventTypeRepository.get(eventTypeId);

    if (!eventType || eventType.isArchived) {
      throw new AppError(404, "not_found", "Event type not found.");
    }

    return eventType;
  }
}

function toCreateBookingInput(input: unknown): CreateBookingInput {
  if (!input || typeof input !== "object") {
    throw new AppError(400, "bad_request", "eventTypeId must be a non-empty string.");
  }

  const { eventTypeId, startAt, endAt, guestName, guestEmail } = input as Record<string, unknown>;

  if (!isNonEmptyString(eventTypeId)) {
    throw new AppError(400, "bad_request", "eventTypeId must be a non-empty string.");
  }

  if (!isNonEmptyString(guestName)) {
    throw new AppError(400, "bad_request", "guestName must be a non-empty string.");
  }

  if (!isNonEmptyString(guestEmail)) {
    throw new AppError(400, "bad_request", "guestEmail must be a non-empty string.");
  }

  if (!isValidEmail(guestEmail.trim())) {
    throw new AppError(400, "bad_request", "guestEmail must be a valid email address.");
  }

  return {
    eventTypeId: eventTypeId.trim(),
    startAt: typeof startAt === "string" ? startAt.trim() : "",
    endAt: typeof endAt === "string" ? endAt.trim() : "",
    guestName: guestName.trim(),
    guestEmail: guestEmail.trim(),
  };
}

function matchesSchedule(
  schedule: OwnerSchedule,
  startAt: Date,
  endAt: Date,
  durationMinutes: number,
) {
  if (!schedule.workingDays.includes(weekday(startAt))) {
    return false;
  }

  const scheduleStart = setUtcTime(startOfUtcDay(startAt), schedule.startTime);
  const scheduleEnd = setUtcTime(startOfUtcDay(startAt), schedule.endTime);

  if (startAt < scheduleStart || endAt > scheduleEnd) {
    return false;
  }

  return differenceInMinutes(startAt, scheduleStart) % durationMinutes === 0;
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function intervalsOverlap(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && startB < endA;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseBookingTimestamps(startAt: string, endAt: string) {
  if (!isUtcIsoDateTimeString(startAt) || !isUtcIsoDateTimeString(endAt)) {
    throw new AppError(400, "bad_request", "Invalid booking timestamps.");
  }

  const parsedStartAt = new Date(startAt);
  const parsedEndAt = new Date(endAt);

  if (Number.isNaN(parsedStartAt.getTime()) || Number.isNaN(parsedEndAt.getTime())) {
    throw new AppError(400, "bad_request", "Invalid booking timestamps.");
  }

  return { startAt: parsedStartAt, endAt: parsedEndAt };
}

function isUtcIsoDateTimeString(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value);
}
