import { describe, expect, it } from "vitest";

import {
  archiveOwnerEventType,
  buildOwnerEventTypeForm,
  createEmptyOwnerEventTypeForm,
  deleteOwnerEventType,
  saveOwnerEventType,
  validateOwnerEventTypeForm,
} from "./ownerEventTypes";
import type { OwnerEventType } from "../types";

const baseEventTypes: OwnerEventType[] = [
  {
    id: "strategy",
    title: "Стратегическая сессия",
    description: "Разбор целей и следующих шагов.",
    durationMinutes: 60,
    isArchived: false,
    hasBookings: true,
  },
  {
    id: "sync",
    title: "Короткий созвон",
    description: "Короткая синхронизация по задаче.",
    durationMinutes: 20,
    isArchived: false,
    hasBookings: false,
  },
];

describe("ownerEventTypes helpers", () => {
  it("creates an empty form for create mode", () => {
    expect(createEmptyOwnerEventTypeForm()).toEqual({
      title: "",
      description: "",
      durationMinutes: "",
    });
  });

  it("builds a form from an existing owner event type", () => {
    expect(buildOwnerEventTypeForm(baseEventTypes[0])).toEqual({
      title: "Стратегическая сессия",
      description: "Разбор целей и следующих шагов.",
      durationMinutes: "60",
    });
  });

  it("validates required fields and positive integer duration", () => {
    expect(
      validateOwnerEventTypeForm({
        title: "   ",
        description: "Описание",
        durationMinutes: "30",
      }),
    ).toBe("Укажите название типа события.");

    expect(
      validateOwnerEventTypeForm({
        title: "Созвон",
        description: "   ",
        durationMinutes: "30",
      }),
    ).toBe("Добавьте короткое описание типа события.");

    expect(
      validateOwnerEventTypeForm({
        title: "Созвон",
        description: "Описание",
        durationMinutes: "0",
      }),
    ).toBe("Длительность должна быть указана в минутах и быть больше нуля.");

    expect(
      validateOwnerEventTypeForm({
        title: "Созвон",
        description: "Описание",
        durationMinutes: "45",
      }),
    ).toBe("");
  });

  it("saves a new event type with trimmed fields and a unique generated id", () => {
    const result = saveOwnerEventType(
      baseEventTypes,
      {
        title: "  Короткий созвон  ",
        description: "  Новый формат для быстрых решений.  ",
        durationMinutes: "25",
      },
      null,
    );

    expect(result.selectedEventTypeId).toBe("короткий-созвон");
    expect(result.eventTypes[0]).toEqual({
      id: "короткий-созвон",
      title: "Короткий созвон",
      description: "Новый формат для быстрых решений.",
      durationMinutes: 25,
      isArchived: false,
      hasBookings: false,
    });
    expect(baseEventTypes).toHaveLength(2);
    expect(baseEventTypes[0].title).toBe("Стратегическая сессия");
  });

  it("updates the selected event type in edit mode and keeps its id selected", () => {
    const result = saveOwnerEventType(
      baseEventTypes,
      {
        title: "  Обновленный созвон ",
        description: "  Обновленное описание. ",
        durationMinutes: "30",
      },
      "sync",
    );

    expect(result.selectedEventTypeId).toBe("sync");
    expect(result.eventTypes).toEqual([
      baseEventTypes[0],
      {
        ...baseEventTypes[1],
        title: "Обновленный созвон",
        description: "Обновленное описание.",
        durationMinutes: 30,
      },
    ]);
  });

  it("archives only the requested event type", () => {
    const result = archiveOwnerEventType(baseEventTypes, "sync");

    expect(result).toEqual([
      baseEventTypes[0],
      {
        ...baseEventTypes[1],
        isArchived: true,
      },
    ]);
    expect(baseEventTypes[1].isArchived).toBe(false);
  });

  it("deletes only the requested unused event type from the list", () => {
    const result = deleteOwnerEventType(baseEventTypes, "sync");

    expect(result).toEqual([baseEventTypes[0]]);
    expect(baseEventTypes).toHaveLength(2);
  });
});
