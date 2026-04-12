import { randomUUID } from "node:crypto";

import { AppError } from "../lib/errors.js";
import { InMemoryBookingRepository } from "../repositories/inMemoryBookingRepository.js";
import { InMemoryEventTypeRepository } from "../repositories/inMemoryEventTypeRepository.js";
import type { CreateEventTypeInput, EventType, OwnerEventType, StoredEventType } from "../types.js";

export class EventTypeService {
  constructor(
    private readonly repository: InMemoryEventTypeRepository,
    private readonly bookingRepository: InMemoryBookingRepository,
  ) {}

  listGuestEventTypes(): EventType[] {
    return this.repository.listActive().map(toGuestEventType);
  }

  listOwnerEventTypes(): OwnerEventType[] {
    return this.repository.list().map((eventType) => this.toOwnerEventType(eventType));
  }

  createEventType(input: unknown): EventType {
    const payload = toEventTypeInput(input);

    if (!Number.isInteger(payload.durationMinutes) || payload.durationMinutes <= 0) {
      throw new AppError(400, "bad_request", "durationMinutes must be a positive integer.");
    }

    const created = this.repository.save({
      id: randomUUID(),
      title: payload.title,
      description: payload.description,
      durationMinutes: payload.durationMinutes,
      isArchived: false,
    });

    return toGuestEventType(created);
  }

  updateEventType(eventTypeId: string, input: unknown): OwnerEventType {
    const eventType = this.getStoredEventType(eventTypeId);
    const payload = toEventTypeInput(input);

    if (!Number.isInteger(payload.durationMinutes) || payload.durationMinutes <= 0) {
      throw new AppError(400, "bad_request", "durationMinutes must be a positive integer.");
    }

    const updated = this.repository.save({
      ...eventType,
      title: payload.title,
      description: payload.description,
      durationMinutes: payload.durationMinutes,
    });

    return this.toOwnerEventType(updated);
  }

  archiveEventType(eventTypeId: string): OwnerEventType {
    const eventType = this.getStoredEventType(eventTypeId);

    if (eventType.isArchived) {
      throw new AppError(409, "conflict", "Event type is already archived.");
    }

    const archived = this.repository.save({
      ...eventType,
      isArchived: true,
    });

    return this.toOwnerEventType(archived);
  }

  deleteEventType(eventTypeId: string) {
    this.getStoredEventType(eventTypeId);

    if (this.bookingRepository.hasAnyBookingForEventType(eventTypeId)) {
      throw new AppError(409, "conflict", "Used event types can only be archived.");
    }

    this.repository.delete(eventTypeId);
  }

  private getStoredEventType(eventTypeId: string): StoredEventType {
    const eventType = this.repository.get(eventTypeId);

    if (!eventType) {
      throw new AppError(404, "not_found", "Event type not found.");
    }

    return eventType;
  }

  private toOwnerEventType(eventType: StoredEventType): OwnerEventType {
    return {
      ...eventType,
      hasBookings: this.bookingRepository.hasAnyBookingForEventType(eventType.id),
    };
  }
}

function toGuestEventType(eventType: StoredEventType): EventType {
  return {
    id: eventType.id,
    title: eventType.title,
    description: eventType.description,
    durationMinutes: eventType.durationMinutes,
  };
}

function toEventTypeInput(input: unknown): CreateEventTypeInput {
  if (!input || typeof input !== "object") {
    throw new AppError(400, "bad_request", "title must be a non-empty string.");
  }

  const { title, description, durationMinutes } = input as Record<string, unknown>;
  const trimmedTitle = typeof title === "string" ? title.trim() : "";

  if (!trimmedTitle) {
    throw new AppError(400, "bad_request", "title must be a non-empty string.");
  }

  if (description !== undefined && typeof description !== "string") {
    throw new AppError(400, "bad_request", "description must be a string if provided.");
  }

  if (typeof durationMinutes !== "number") {
    throw new AppError(400, "bad_request", "durationMinutes must be a positive integer.");
  }

  return {
    title: trimmedTitle,
    description: description?.trim() || undefined,
    durationMinutes,
  };
}