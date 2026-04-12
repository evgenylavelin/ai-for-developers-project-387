import type { EventType, OwnerEventType, OwnerEventTypeInput } from "../types";

import { buildApiUrl, readApiErrorMessage } from "./apiBase";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isEventType(value: unknown): value is EventType {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.durationMinutes === "number" &&
    (value.description === undefined || typeof value.description === "string")
  );
}

function isOwnerEventType(value: unknown): value is OwnerEventType {
  if (!isEventType(value)) {
    return false;
  }

  return typeof value.isArchived === "boolean" && typeof value.hasBookings === "boolean";
}

async function fetchEventTypes<T extends EventType | OwnerEventType>(
  path: string,
  fallbackMessage: string,
  validator: (value: unknown) => value is T,
): Promise<T[]> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl(path));
  } catch {
    throw new Error(fallbackMessage);
  }

  if (!response.ok) {
    const backendMessage = await readApiErrorMessage(response);
    throw new Error(backendMessage ?? fallbackMessage);
  }

  const payload = await response.json();

  if (!Array.isArray(payload) || !payload.every(validator)) {
    throw new Error(fallbackMessage);
  }

  return payload;
}

async function fetchJson<T>(
  path: string,
  init: RequestInit,
  fallbackMessage: string,
  validator: (value: unknown) => value is T,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl(path), init);
  } catch {
    throw new Error(fallbackMessage);
  }

  if (!response.ok) {
    const backendMessage = await readApiErrorMessage(response);
    throw new Error(backendMessage ?? fallbackMessage);
  }

  const payload = await response.json();

  if (!validator(payload)) {
    throw new Error(fallbackMessage);
  }

  return payload;
}

function createJsonRequest(method: "POST" | "PATCH", body: unknown): RequestInit {
  return {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

export function getGuestEventTypes(): Promise<EventType[]> {
  return fetchEventTypes("/event-types", "Не удалось загрузить типы событий.", isEventType);
}

export function getOwnerEventTypes(): Promise<OwnerEventType[]> {
  return fetchEventTypes(
    "/owner/event-types",
    "Не удалось загрузить типы событий владельца.",
    isOwnerEventType,
  );
}

export function createOwnerEventType(input: OwnerEventTypeInput): Promise<EventType> {
  return fetchJson(
    "/owner/event-types",
    createJsonRequest("POST", input),
    "Не удалось создать тип события.",
    isEventType,
  );
}

export function updateOwnerEventType(
  eventTypeId: string,
  input: OwnerEventTypeInput,
): Promise<OwnerEventType> {
  return fetchJson(
    `/owner/event-types/${eventTypeId}`,
    createJsonRequest("PATCH", input),
    "Не удалось сохранить тип события.",
    isOwnerEventType,
  );
}

export function archiveOwnerEventType(eventTypeId: string): Promise<OwnerEventType> {
  return fetchJson(
    `/owner/event-types/${eventTypeId}:archive`,
    { method: "POST" },
    "Не удалось архивировать тип события.",
    isOwnerEventType,
  );
}

export async function deleteOwnerEventType(eventTypeId: string): Promise<void> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl(`/owner/event-types/${eventTypeId}`), {
      method: "DELETE",
    });
  } catch {
    throw new Error("Не удалось удалить тип события.");
  }

  if (!response.ok) {
    const backendMessage = await readApiErrorMessage(response);
    throw new Error(backendMessage ?? "Не удалось удалить тип события.");
  }
}