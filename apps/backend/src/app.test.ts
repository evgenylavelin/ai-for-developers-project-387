import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createApp } from "./app.js";
import { InMemoryBookingRepository } from "./repositories/inMemoryBookingRepository.js";
import { InMemoryEventTypeRepository } from "./repositories/inMemoryEventTypeRepository.js";
import { InMemoryScheduleRepository } from "./repositories/inMemoryScheduleRepository.js";
import { BookingService } from "./services/bookingService.js";
import { isValidEmail } from "./lib/validation.js";

describe("backend routes", () => {
  it("serves the built frontend index when a dist directory is available", async () => {
    const frontendDistDir = mkdtempSync(path.join(os.tmpdir(), "callplanner-frontend-"));

    writeFileSync(path.join(frontendDistDir, "index.html"), "<!doctype html><html><body>Callplanner</body></html>");

    const app = createApp({ frontendDistDir });

    const response = await app.inject({ method: "GET", url: "/" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain("Callplanner");

    await app.close();
    rmSync(frontendDistDir, { recursive: true, force: true });
  });

  it("returns the default owner schedule", async () => {
    const app = createApp();

    const response = await app.inject({ method: "GET", url: "/schedule" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      startTime: "09:00",
      endTime: "18:00",
    });

    await app.close();
  });

  it("rejects schedule updates without working days", async () => {
    const app = createApp();

    const response = await app.inject({
      method: "PUT",
      url: "/schedule",
      payload: { workingDays: [], startTime: "09:00", endTime: "18:00" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      code: "bad_request",
      message: "Укажите хотя бы один рабочий день.",
    });

    await app.close();
  });

  it("rejects malformed schedule updates with a 400 response", async () => {
    const app = createApp();

    const response = await app.inject({
      method: "PUT",
      url: "/schedule",
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      code: "bad_request",
      message: "Укажите хотя бы один рабочий день.",
    });

    await app.close();
  });

  it("rejects schedule updates with unsupported weekdays", async () => {
    const app = createApp();

    const response = await app.inject({
      method: "PUT",
      url: "/schedule",
      payload: {
        workingDays: ["nonday"],
        startTime: "09:00",
        endTime: "18:00",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      code: "bad_request",
      message: "Укажите корректные рабочие дни.",
    });

    await app.close();
  });

  it("rejects schedule updates with non-string weekday values", async () => {
    const app = createApp();

    const response = await app.inject({
      method: "PUT",
      url: "/schedule",
      payload: {
        workingDays: ["monday", 123],
        startTime: "09:00",
        endTime: "18:00",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      code: "bad_request",
      message: "Укажите корректные рабочие дни.",
    });

    await app.close();
  });

  it("updates the owner schedule when the payload is valid", async () => {
    const app = createApp();

    const response = await app.inject({
      method: "PUT",
      url: "/schedule",
      payload: {
        workingDays: ["monday", "wednesday", "friday"],
        startTime: "10:00",
        endTime: "16:00",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      workingDays: ["monday", "wednesday", "friday"],
      startTime: "10:00",
      endTime: "16:00",
    });

    await app.close();
  });

  it("creates and lists event types", async () => {
    const app = createApp();

    const createResponse = await app.inject({
      method: "POST",
      url: "/owner/event-types",
      payload: {
        title: "Стратегическая сессия",
        description: "Разбор целей и следующих шагов.",
        durationMinutes: 60,
      },
    });

    expect(createResponse.statusCode).toBe(201);

    const listResponse = await app.inject({ method: "GET", url: "/event-types" });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toEqual([
      expect.objectContaining({
        title: "Стратегическая сессия",
        description: "Разбор целей и следующих шагов.",
        durationMinutes: 60,
      }),
    ]);

    await app.close();
  });

  it("rejects event types with duration outside 1 to 360 minutes", async () => {
    const app = createApp();

    const tooSmallResponse = await app.inject({
      method: "POST",
      url: "/owner/event-types",
      payload: {
        title: "Ошибка",
        description: "Некорректная длительность.",
        durationMinutes: 0,
      },
    });

    expect(tooSmallResponse.statusCode).toBe(400);
    expect(tooSmallResponse.json()).toEqual({
      code: "bad_request",
      message: "durationMinutes must be an integer between 1 and 360.",
    });

    const tooLargeResponse = await app.inject({
      method: "POST",
      url: "/owner/event-types",
      payload: {
        title: "Длинная встреча",
        description: "Слишком длинная длительность.",
        durationMinutes: 361,
      },
    });

    expect(tooLargeResponse.statusCode).toBe(400);
    expect(tooLargeResponse.json()).toEqual({
      code: "bad_request",
      message: "durationMinutes must be an integer between 1 and 360.",
    });

    const acceptedResponse = await app.inject({
      method: "POST",
      url: "/owner/event-types",
      payload: {
        title: "Длинная стратегия",
        description: "Граничное валидное значение.",
        durationMinutes: 360,
      },
    });

    expect(acceptedResponse.statusCode).toBe(201);
    expect(acceptedResponse.json()).toEqual(
      expect.objectContaining({
        title: "Длинная стратегия",
        durationMinutes: 360,
      }),
    );
  
    const minimumResponse = await app.inject({
      method: "POST",
      url: "/owner/event-types",
      payload: {
        title: "Короткая встреча",
        description: "Минимальное валидное значение.",
        durationMinutes: 1,
      },
    });

    expect(minimumResponse.statusCode).toBe(201);
    expect(minimumResponse.json()).toEqual(
      expect.objectContaining({
        title: "Короткая встреча",
        durationMinutes: 1,
      }),
    );

    await app.close();
  });

  it("rejects event type updates with duration above 360 minutes", async () => {
    const app = createApp();

    const createResponse = await app.inject({
      method: "POST",
      url: "/owner/event-types",
      payload: {
        title: "Стратегия",
        description: "Базовый тип.",
        durationMinutes: 60,
      },
    });

    const { id } = createResponse.json() as { id: string };

    const response = await app.inject({
      method: "PATCH",
      url: `/owner/event-types/${id}`,
      payload: {
        title: "Стратегия",
        description: "Базовый тип.",
        durationMinutes: 361,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      code: "bad_request",
      message: "durationMinutes must be an integer between 1 and 360.",
    });

    await app.close();
  });

  it("rejects event types without a non-empty title", async () => {
    const app = createApp();

    const response = await app.inject({
      method: "POST",
      url: "/owner/event-types",
      payload: {
        title: "   ",
        description: "Некорректный заголовок.",
        durationMinutes: 30,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      code: "bad_request",
      message: "title must be a non-empty string.",
    });

    await app.close();
  });

  it("returns archived event types in the owner list but not in the guest list", async () => {
    const app = createApp();

    const createResponse = await app.inject({
      method: "POST",
      url: "/owner/event-types",
      payload: {
        title: "Диагностика",
        description: "Проверка запроса.",
        durationMinutes: 30,
      },
    });

    const { id } = createResponse.json() as { id: string };

    const archiveResponse = await app.inject({
      method: "POST",
      url: `/owner/event-types/${id}:archive`,
    });

    expect(archiveResponse.statusCode).toBe(200);
    expect(archiveResponse.json()).toEqual(
      expect.objectContaining({
        id,
        title: "Диагностика",
        description: "Проверка запроса.",
        durationMinutes: 30,
        isArchived: true,
        hasBookings: false,
      }),
    );

    const ownerListResponse = await app.inject({ method: "GET", url: "/owner/event-types" });
    const guestListResponse = await app.inject({ method: "GET", url: "/event-types" });

    expect(ownerListResponse.statusCode).toBe(200);
    expect(ownerListResponse.json()).toEqual([
      expect.objectContaining({ id, isArchived: true, hasBookings: false }),
    ]);

    expect(guestListResponse.statusCode).toBe(200);
    expect(guestListResponse.json()).toEqual([]);

    await app.close();
  });

  it("rejects archived event type availability requests for guests", async () => {
    const app = createApp();

    const createResponse = await app.inject({
      method: "POST",
      url: "/owner/event-types",
      payload: {
        title: "Архивная встреча",
        description: "Недоступна для гостей.",
        durationMinutes: 30,
      },
    });

    const { id } = createResponse.json() as { id: string };

    await app.inject({
      method: "POST",
      url: `/owner/event-types/${id}:archive`,
    });

    const response = await app.inject({
      method: "GET",
      url: `/event-types/${id}/availability`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      code: "not_found",
      message: "Event type not found.",
    });

    await app.close();
  });

  it("rejects bookings for archived event types", async () => {
    const app = createApp();
    const bookingStart = nextBookableSlotStart(new Date());
    const bookingEnd = new Date(bookingStart.getTime() + 30 * 60 * 1000);

    const createResponse = await app.inject({
      method: "POST",
      url: "/owner/event-types",
      payload: {
        title: "Архивная встреча",
        description: "Недоступна для бронирования.",
        durationMinutes: 30,
      },
    });

    const { id } = createResponse.json() as { id: string };

    await app.inject({
      method: "POST",
      url: `/owner/event-types/${id}:archive`,
    });

    const response = await app.inject({
      method: "POST",
      url: "/bookings",
      payload: {
        eventTypeId: id,
        startAt: bookingStart.toISOString(),
        endAt: bookingEnd.toISOString(),
        guestName: "Guest",
        guestEmail: "guest@example.com",
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      code: "not_found",
      message: "Event type not found.",
    });

    await app.close();
  });

  it("updates owner event types", async () => {
    const app = createApp();

    const createResponse = await app.inject({
      method: "POST",
      url: "/owner/event-types",
      payload: {
        title: "Исходная встреча",
        description: "Первичное описание.",
        durationMinutes: 30,
      },
    });

    const { id } = createResponse.json() as { id: string };

    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/owner/event-types/${id}`,
      payload: {
        title: "Обновленная встреча",
        description: "Новое описание.",
        durationMinutes: 45,
      },
    });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json()).toEqual({
      id,
      title: "Обновленная встреча",
      description: "Новое описание.",
      durationMinutes: 45,
      isArchived: false,
      hasBookings: false,
    });

    const ownerListResponse = await app.inject({ method: "GET", url: "/owner/event-types" });

    expect(ownerListResponse.json()).toEqual([
      {
        id,
        title: "Обновленная встреча",
        description: "Новое описание.",
        durationMinutes: 45,
        isArchived: false,
        hasBookings: false,
      },
    ]);

    await app.close();
  });

  it("rejects updating a missing owner event type", async () => {
    const app = createApp();

    const response = await app.inject({
      method: "PATCH",
      url: "/owner/event-types/missing",
      payload: {
        title: "Обновленная встреча",
        description: "Новое описание.",
        durationMinutes: 45,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      code: "not_found",
      message: "Event type not found.",
    });

    await app.close();
  });

  it("rejects archiving an already archived event type", async () => {
    const app = createApp();

    const createResponse = await app.inject({
      method: "POST",
      url: "/owner/event-types",
      payload: {
        title: "Архивируемая встреча",
        description: "Описание.",
        durationMinutes: 30,
      },
    });

    const { id } = createResponse.json() as { id: string };

    const firstArchiveResponse = await app.inject({
      method: "POST",
      url: `/owner/event-types/${id}:archive`,
    });

    expect(firstArchiveResponse.statusCode).toBe(200);

    const secondArchiveResponse = await app.inject({
      method: "POST",
      url: `/owner/event-types/${id}:archive`,
    });

    expect(secondArchiveResponse.statusCode).toBe(409);
    expect(secondArchiveResponse.json()).toEqual({
      code: "conflict",
      message: "Event type is already archived.",
    });

    await app.close();
  });

  it("deletes unused event types", async () => {
    const app = createApp();

    const createResponse = await app.inject({
      method: "POST",
      url: "/owner/event-types",
      payload: {
        title: "Удаляемая встреча",
        description: "Описание.",
        durationMinutes: 30,
      },
    });

    const { id } = createResponse.json() as { id: string };

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/owner/event-types/${id}`,
    });

    expect(deleteResponse.statusCode).toBe(204);
    expect(deleteResponse.body).toBe("");

    const ownerListResponse = await app.inject({ method: "GET", url: "/owner/event-types" });
    expect(ownerListResponse.json()).toEqual([]);

    await app.close();
  });

  it("rejects deletion for event types used in bookings", async () => {
    const app = createApp();
    const bookingStart = nextBookableSlotStart(new Date());
    const bookingEnd = new Date(bookingStart.getTime() + 30 * 60 * 1000);

    const createResponse = await app.inject({
      method: "POST",
      url: "/owner/event-types",
      payload: {
        title: "Занятая встреча",
        description: "Описание.",
        durationMinutes: 30,
      },
    });

    const { id } = createResponse.json() as { id: string };

    const bookingResponse = await app.inject({
      method: "POST",
      url: "/bookings",
      payload: {
        eventTypeId: id,
        startAt: bookingStart.toISOString(),
        endAt: bookingEnd.toISOString(),
        guestName: "Guest",
        guestEmail: "guest@example.com",
      },
    });

    expect(bookingResponse.statusCode).toBe(201);

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/owner/event-types/${id}`,
    });

    expect(deleteResponse.statusCode).toBe(409);
    expect(deleteResponse.json()).toEqual({
      code: "conflict",
      message: "Used event types can only be archived.",
    });

    await app.close();
  });

  it("returns only free availability slots for the requested event type duration", async () => {
    const app = createApp();
    const bookingStart = nextBookableSlotStart(new Date());
    const bookingEnd = new Date(bookingStart.getTime() + 60 * 60 * 1000);

    const create60Response = await app.inject({
      method: "POST",
      url: "/owner/event-types",
      payload: {
        title: "Стратегическая сессия",
        description: "Разбор целей и следующих шагов.",
        durationMinutes: 60,
      },
    });

    const create30Response = await app.inject({
      method: "POST",
      url: "/owner/event-types",
      payload: {
        title: "Короткая синхронизация",
        description: "Проверка статуса.",
        durationMinutes: 30,
      },
    });

    const { id: eventType60Id } = create60Response.json() as { id: string };
    const { id: eventType30Id } = create30Response.json() as { id: string };

    const bookingResponse = await app.inject({
      method: "POST",
      url: "/bookings",
      payload: {
        eventTypeId: eventType60Id,
        startAt: bookingStart.toISOString(),
        endAt: bookingEnd.toISOString(),
        guestName: "Guest",
        guestEmail: "guest@example.com",
      },
    });

    expect(bookingResponse.statusCode).toBe(201);

    const response = await app.inject({
      method: "GET",
      url: `/event-types/${eventType30Id}/availability`,
    });

    expect(response.statusCode).toBe(200);

    const slots = response.json() as Array<{ startAt: string; endAt: string }>;

    expect(slots.length).toBeGreaterThan(0);
    expect(
      slots.some(
        (slot) =>
          slot.startAt === bookingStart.toISOString() &&
          slot.endAt === new Date(bookingStart.getTime() + 30 * 60 * 1000).toISOString(),
      ),
    ).toBe(false);
    expect(
      slots.some(
        (slot) =>
          slot.startAt === new Date(bookingStart.getTime() + 30 * 60 * 1000).toISOString() &&
          slot.endAt === bookingEnd.toISOString(),
      ),
    ).toBe(false);
    expect(
      slots.some(
        (slot) =>
          slot.startAt === bookingEnd.toISOString() &&
          slot.endAt === new Date(bookingEnd.getTime() + 30 * 60 * 1000).toISOString(),
      ),
    ).toBe(true);

    await app.close();
  });

  it("rejects booking conflicts with a 409 response", async () => {
    const bookingRepository = new InMemoryBookingRepository();
    const eventTypeRepository = new InMemoryEventTypeRepository();
    const scheduleRepository = new InMemoryScheduleRepository();
    const bookingService = new BookingService(bookingRepository, eventTypeRepository, scheduleRepository);

    eventTypeRepository.save({
      id: "event-type-60",
      title: "Стратегическая сессия",
      description: "Разбор целей и следующих шагов.",
      durationMinutes: 60,
      isArchived: false,
    });
    eventTypeRepository.save({
      id: "event-type-30",
      title: "Синхронизация",
      description: "Проверка статуса.",
      durationMinutes: 30,
      isArchived: false,
    });

    const bookedResponse = bookingService.createBooking(
      {
        eventTypeId: "event-type-60",
        startAt: "2026-04-13T09:00:00.000Z",
        endAt: "2026-04-13T10:00:00.000Z",
        guestName: "Guest",
        guestEmail: "guest@example.com",
      },
      new Date("2026-04-13T08:00:00.000Z"),
    );

    expect(bookedResponse.status).toBe("active");

    try {
      bookingService.createBooking(
        {
          eventTypeId: "event-type-30",
          startAt: "2026-04-13T09:30:00.000Z",
          endAt: "2026-04-13T10:00:00.000Z",
          guestName: "Guest Two",
          guestEmail: "guest2@example.com",
        },
        new Date("2026-04-13T08:00:00.000Z"),
      );

      throw new Error("Expected bookingService.createBooking() to throw.");
    } catch (error) {
      expect(error).toMatchObject({
        statusCode: 409,
        code: "conflict",
        message: "The selected slot is no longer available.",
      });
    }
  });

  it("accepts exact schedule slot boundaries and rejects off-boundary bookings", async () => {
    const app = createApp();
    const slotStart = nextBookableSlotStart(new Date());
    const exactEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
    const misalignedStart = new Date(slotStart.getTime() + 30 * 60 * 1000);
    const misalignedEnd = new Date(misalignedStart.getTime() + 60 * 60 * 1000);

    const eventTypeResponse = await app.inject({
      method: "POST",
      url: "/owner/event-types",
      payload: {
        title: "Стратегическая сессия",
        description: "Разбор целей и следующих шагов.",
        durationMinutes: 60,
      },
    });

    const { id: eventTypeId } = eventTypeResponse.json() as { id: string };

    const exactResponse = await app.inject({
      method: "POST",
      url: "/bookings",
      payload: {
        eventTypeId,
        startAt: slotStart.toISOString(),
        endAt: exactEnd.toISOString(),
        guestName: "Guest",
        guestEmail: "guest@example.com",
      },
    });

    expect(exactResponse.statusCode).toBe(201);

    const offBoundaryApp = createApp();

    const offBoundaryEventTypeResponse = await offBoundaryApp.inject({
      method: "POST",
      url: "/owner/event-types",
      payload: {
        title: "Проверка границы",
        description: "Проверка границы слота.",
        durationMinutes: 60,
      },
    });

    const { id: offBoundaryEventTypeId } = offBoundaryEventTypeResponse.json() as { id: string };

    const offBoundaryResponse = await offBoundaryApp.inject({
      method: "POST",
      url: "/bookings",
      payload: {
        eventTypeId: offBoundaryEventTypeId,
        startAt: misalignedStart.toISOString(),
        endAt: misalignedEnd.toISOString(),
        guestName: "Guest",
        guestEmail: "guest@example.com",
      },
    });

    expect(offBoundaryResponse.statusCode).toBe(409);
    expect(offBoundaryResponse.json()).toEqual({
      code: "conflict",
      message: "The selected slot is outside the owner schedule.",
    });

    await app.close();
    await offBoundaryApp.close();
  });

  it("makes a cancelled slot available again", async () => {
    const app = createApp();
    const bookingStart = nextBookableSlotStart(new Date());
    const bookingEnd = new Date(bookingStart.getTime() + 60 * 60 * 1000);

    const eventTypeResponse = await app.inject({
      method: "POST",
      url: "/owner/event-types",
      payload: {
        title: "Стратегическая сессия",
        description: "Разбор целей и следующих шагов.",
        durationMinutes: 60,
      },
    });

    const { id: eventTypeId } = eventTypeResponse.json() as { id: string };

    const bookingResponse = await app.inject({
      method: "POST",
      url: "/bookings",
      payload: {
        eventTypeId,
        startAt: bookingStart.toISOString(),
        endAt: bookingEnd.toISOString(),
        guestName: "Guest",
        guestEmail: "guest@example.com",
      },
    });

    const { id: bookingId } = bookingResponse.json() as { id: string };

    const cancelResponse = await app.inject({
      method: "POST",
      url: `/bookings/${bookingId}:cancel`,
    });

    expect(cancelResponse.statusCode).toBe(200);
    expect(cancelResponse.json()).toEqual(
      expect.objectContaining({
        id: bookingId,
        status: "cancelled",
      }),
    );

    const availabilityResponse = await app.inject({
      method: "GET",
      url: `/event-types/${eventTypeId}/availability`,
    });

    expect(availabilityResponse.statusCode).toBe(200);
    expect(availabilityResponse.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          startAt: bookingStart.toISOString(),
          endAt: bookingEnd.toISOString(),
        }),
      ]),
    );

    await app.close();
  });

  it("rejects invalid booking payload fields with bad_request responses", async () => {
    const app = createApp();
    const validSlotStart = nextBookableSlotStart(new Date());
    const validSlotEnd = new Date(validSlotStart.getTime() + 60 * 60 * 1000);

    const eventTypeResponse = await app.inject({
      method: "POST",
      url: "/owner/event-types",
      payload: {
        title: "Стратегическая сессия",
        description: "Разбор целей и следующих шагов.",
        durationMinutes: 60,
      },
    });

    const { id: eventTypeId } = eventTypeResponse.json() as { id: string };

    const invalidEventTypeResponse = await app.inject({
      method: "POST",
      url: "/bookings",
      payload: {
        eventTypeId: "   ",
        startAt: validSlotStart.toISOString(),
        endAt: validSlotEnd.toISOString(),
        guestName: "Guest",
        guestEmail: "guest@example.com",
      },
    });

    expect(invalidEventTypeResponse.statusCode).toBe(400);
    expect(invalidEventTypeResponse.json()).toEqual({
      code: "bad_request",
      message: "eventTypeId must be a non-empty string.",
    });

    const invalidGuestNameResponse = await app.inject({
      method: "POST",
      url: "/bookings",
      payload: {
        eventTypeId,
        startAt: validSlotStart.toISOString(),
        endAt: validSlotEnd.toISOString(),
        guestName: "   ",
        guestEmail: "guest@example.com",
      },
    });

    expect(invalidGuestNameResponse.statusCode).toBe(400);
    expect(invalidGuestNameResponse.json()).toEqual({
      code: "bad_request",
      message: "guestName must be a non-empty string.",
    });

    const invalidGuestEmailResponse = await app.inject({
      method: "POST",
      url: "/bookings",
      payload: {
        eventTypeId,
        startAt: validSlotStart.toISOString(),
        endAt: validSlotEnd.toISOString(),
        guestName: "Guest",
        guestEmail: "   ",
      },
    });

    expect(invalidGuestEmailResponse.statusCode).toBe(400);
    expect(invalidGuestEmailResponse.json()).toEqual({
      code: "bad_request",
      message: "guestEmail must be a non-empty string.",
    });

    await app.close();
  });

  it("rejects invalid booking timestamps and endAt values beyond the 14-day cutoff", async () => {
    const app = createApp();

    const eventTypeResponse = await app.inject({
      method: "POST",
      url: "/owner/event-types",
      payload: {
        title: "Стратегическая сессия",
        description: "Разбор целей и следующих шагов.",
        durationMinutes: 120,
      },
    });

    const { id: eventTypeId } = eventTypeResponse.json() as { id: string };

    const invalidTimestampResponse = await app.inject({
      method: "POST",
      url: "/bookings",
      payload: {
        eventTypeId,
        startAt: "not-a-date",
        endAt: "still-not-a-date",
        guestName: "Guest",
        guestEmail: "guest@example.com",
      },
    });

    expect(invalidTimestampResponse.statusCode).toBe(400);
    expect(invalidTimestampResponse.json()).toEqual({
      code: "bad_request",
      message: "Invalid booking timestamps.",
    });

    const invalidIsoShapeResponse = await app.inject({
      method: "POST",
      url: "/bookings",
      payload: {
        eventTypeId,
        startAt: "2026-04-13",
        endAt: "2026-04-13T11:00:00.000Z",
        guestName: "Guest",
        guestEmail: "guest@example.com",
      },
    });

    expect(invalidIsoShapeResponse.statusCode).toBe(400);
    expect(invalidIsoShapeResponse.json()).toEqual({
      code: "bad_request",
      message: "Invalid booking timestamps.",
    });

    const bookingRepository = new InMemoryBookingRepository();
    const eventTypeRepository = new InMemoryEventTypeRepository();
    const scheduleRepository = new InMemoryScheduleRepository();
    const bookingService = new BookingService(bookingRepository, eventTypeRepository, scheduleRepository);
    eventTypeRepository.save({
      id: "event-type-120",
      title: "Двухчасовая встреча",
      description: "Проверка окна бронирования.",
      durationMinutes: 120,
      isArchived: false,
    });
    scheduleRepository.save({
      workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      startTime: "09:00",
      endTime: "18:00",
    });

    try {
      bookingService.createBooking(
        {
          eventTypeId: "event-type-120",
          startAt: "2026-04-27T09:00:00.000Z",
          endAt: "2026-04-27T11:00:00.000Z",
          guestName: "Guest",
          guestEmail: "guest@example.com",
        },
        new Date("2026-04-13T10:00:00.000Z"),
      );

      throw new Error("Expected bookingService.createBooking() to throw.");
    } catch (error) {
      expect(error).toMatchObject({
        statusCode: 409,
        code: "conflict",
        message: "The selected slot is outside the 14-day booking window.",
      });
    }

    await app.close();
  });

  it("rejects bookings with invalid email formats", async () => {
    const app = createApp();
    const bookingStart = nextBookableSlotStart(new Date());
    const bookingEnd = new Date(bookingStart.getTime() + 30 * 60 * 1000);

    const eventTypeResponse = await app.inject({
      method: "POST",
      url: "/owner/event-types",
      payload: {
        title: "Тест email",
        description: "Проверка валидации email.",
        durationMinutes: 30,
      },
    });

    const { id: eventTypeId } = eventTypeResponse.json() as { id: string };

    const invalidEmails = [
      ".test@example.com",
      "test.@example.com",
      "test..name@example.com",
      "test@.example.com",
      "test@example..com",
      "test@example",
      "notanemail",
      "ivan@ex.a",
    ];

    for (const invalidEmail of invalidEmails) {
      const response = await app.inject({
        method: "POST",
        url: "/bookings",
        payload: {
          eventTypeId,
          startAt: bookingStart.toISOString(),
          endAt: bookingEnd.toISOString(),
          guestName: "Guest",
          guestEmail: invalidEmail,
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        code: "bad_request",
        message: "guestEmail must be a valid email address.",
      });
    }

    await app.close();
  });

  it("accepts bookings with valid email formats", async () => {
    const validEmails = [
      "user@example.com",
      "user+tag@example.com",
      "user_name@sub.domain.com",
      "a@b.cd",
      "A@B.CO",
    ];

    for (const validEmail of validEmails) {
      const app = createApp();

      const eventTypeResponse = await app.inject({
        method: "POST",
        url: "/owner/event-types",
        payload: {
          title: "Тест email",
          description: "Проверка валидации email.",
          durationMinutes: 30,
        },
      });

      const { id: eventTypeId } = eventTypeResponse.json() as { id: string };
      const bookingStart = nextBookableSlotStart(new Date());
      const bookingEnd = new Date(bookingStart.getTime() + 30 * 60 * 1000);

      const response = await app.inject({
        method: "POST",
        url: "/bookings",
        payload: {
          eventTypeId,
          startAt: bookingStart.toISOString(),
          endAt: bookingEnd.toISOString(),
          guestName: "Guest",
          guestEmail: validEmail,
        },
      });

      expect(response.statusCode).toBe(201);
      await app.close();
    }
  });
});

describe("isValidEmail", () => {
  const invalidCases = [
    ".test@example.com",
    "test.@example.com",
    "test..name@example.com",
    "test@.example.com",
    "test@example..com",
    "test@example",
    "notanemail",
    "",
    "   ",
    "ivan@ex.a",
    "a".repeat(255) + "@example.com",
  ];

  const validCases = [
    "user@example.com",
    "user+tag@example.com",
    "user_name@sub.domain.com",
    "a@b.cd",
    "A@B.CO",
    "user-name@example.org",
    "user.name@example.com",
  ];

  it.each(invalidCases)("rejects invalid email: %s", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });

  it.each(validCases)("accepts valid email: %s", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });
});

function nextBookableSlotStart(now: Date) {
  const next = new Date(now);
  next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCHours(9, 0, 0, 0);

  while (!isWorkingDay(next)) {
    next.setUTCDate(next.getUTCDate() + 1);
    next.setUTCHours(9, 0, 0, 0);
  }

  return next;
}

function isWorkingDay(date: Date) {
  return [1, 2, 3, 4, 5].includes(date.getUTCDay());
}
