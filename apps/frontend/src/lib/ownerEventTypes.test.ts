import { describe, expect, it } from "vitest";

import {
  buildOwnerEventTypeInput,
  buildOwnerEventTypeForm,
  createEmptyOwnerEventTypeForm,
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

  it("builds a trimmed API payload from the form values", () => {
    expect(
      buildOwnerEventTypeInput({
        title: "  Обновленный созвон ",
        description: "  Обновленное описание. ",
        durationMinutes: "30",
      }),
    ).toEqual({
      title: "Обновленный созвон",
      description: "Обновленное описание.",
      durationMinutes: 30,
    });

    expect(
      buildOwnerEventTypeInput({
        title: "Созвон",
        description: "   ",
        durationMinutes: "15",
      }),
    ).toEqual({
      title: "Созвон",
      description: undefined,
      durationMinutes: 15,
    });
  });
});
