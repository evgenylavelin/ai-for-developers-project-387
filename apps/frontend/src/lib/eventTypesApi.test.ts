import { afterEach, describe, expect, it, vi } from "vitest";

import {
  archiveOwnerEventType,
  createOwnerEventType,
  deleteOwnerEventType,
  getGuestEventTypes,
  getOwnerEventTypes,
  updateOwnerEventType,
} from "./eventTypesApi";

describe("eventTypesApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("loads guest event types from the same-origin API by default", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: "intro",
          title: "Короткий созвон",
          description: "Быстрая проверка контекста.",
          durationMinutes: 15,
        },
      ],
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(getGuestEventTypes()).resolves.toEqual([
      {
        id: "intro",
        title: "Короткий созвон",
        description: "Быстрая проверка контекста.",
        durationMinutes: 15,
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith("/event-types");
  });

  it("loads owner event types using VITE_API_BASE_URL when configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: "standard",
          title: "Стратегическая сессия",
          description: "Разбор текущего плана.",
          durationMinutes: 30,
          isArchived: false,
          hasBookings: true,
        },
      ],
    });

    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com/");

    await expect(getOwnerEventTypes()).resolves.toEqual([
      {
        id: "standard",
        title: "Стратегическая сессия",
        description: "Разбор текущего плана.",
        durationMinutes: 30,
        isArchived: false,
        hasBookings: true,
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith("https://api.example.com/owner/event-types");
  });

  it("surfaces backend error messages for owner event type loading", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        text: async () => JSON.stringify({ message: "Event type service is unavailable." }),
      }),
    );

    await expect(getOwnerEventTypes()).rejects.toThrow("Event type service is unavailable.");
  });

  it("creates an owner event type through the owner API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "standard",
        title: "Стратегическая сессия",
        description: "Разбор текущего плана.",
        durationMinutes: 30,
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createOwnerEventType({
        title: "Стратегическая сессия",
        description: "Разбор текущего плана.",
        durationMinutes: 30,
      }),
    ).resolves.toEqual({
      id: "standard",
      title: "Стратегическая сессия",
      description: "Разбор текущего плана.",
      durationMinutes: 30,
    });

    expect(fetchMock).toHaveBeenCalledWith("/owner/event-types", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Стратегическая сессия",
        description: "Разбор текущего плана.",
        durationMinutes: 30,
      }),
    });
  });

  it("updates an owner event type through the owner API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "standard",
        title: "Обновленная сессия",
        description: "Новый фокус встречи.",
        durationMinutes: 45,
        isArchived: false,
        hasBookings: false,
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      updateOwnerEventType("standard", {
        title: "Обновленная сессия",
        description: "Новый фокус встречи.",
        durationMinutes: 45,
      }),
    ).resolves.toEqual({
      id: "standard",
      title: "Обновленная сессия",
      description: "Новый фокус встречи.",
      durationMinutes: 45,
      isArchived: false,
      hasBookings: false,
    });

    expect(fetchMock).toHaveBeenCalledWith("/owner/event-types/standard", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Обновленная сессия",
        description: "Новый фокус встречи.",
        durationMinutes: 45,
      }),
    });
  });

  it("archives an owner event type through the owner API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "standard",
        title: "Стратегическая сессия",
        description: "Разбор текущего плана.",
        durationMinutes: 30,
        isArchived: true,
        hasBookings: true,
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(archiveOwnerEventType("standard")).resolves.toEqual({
      id: "standard",
      title: "Стратегическая сессия",
      description: "Разбор текущего плана.",
      durationMinutes: 30,
      isArchived: true,
      hasBookings: true,
    });

    expect(fetchMock).toHaveBeenCalledWith("/owner/event-types/standard:archive", {
      method: "POST",
    });
  });

  it("surfaces backend error messages when deleting an owner event type fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        text: async () => JSON.stringify({ message: "Used event types can only be archived." }),
      }),
    );

    await expect(deleteOwnerEventType("standard")).rejects.toThrow(
      "Used event types can only be archived.",
    );
  });

  it("rejects malformed guest event type payloads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ id: "intro", title: "Короткий созвон" }],
      }),
    );

    await expect(getGuestEventTypes()).rejects.toThrow("Не удалось загрузить типы событий.");
  });
});