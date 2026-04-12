import type { OwnerEventType, OwnerEventTypeForm } from "../types";

export function createEmptyOwnerEventTypeForm(): OwnerEventTypeForm {
  return {
    title: "",
    description: "",
    durationMinutes: "",
  };
}

export function buildOwnerEventTypeForm(eventType: OwnerEventType): OwnerEventTypeForm {
  return {
    title: eventType.title,
    description: eventType.description,
    durationMinutes: String(eventType.durationMinutes),
  };
}

export function validateOwnerEventTypeForm(form: OwnerEventTypeForm): string {
  if (!form.title.trim()) {
    return "Укажите название типа события.";
  }

  if (!form.description.trim()) {
    return "Добавьте короткое описание типа события.";
  }

  const durationMinutes = Number(form.durationMinutes);

  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    return "Длительность должна быть указана в минутах и быть больше нуля.";
  }

  return "";
}

export function saveOwnerEventType(
  eventTypes: OwnerEventType[],
  form: OwnerEventTypeForm,
  selectedEventTypeId: string | null,
): { eventTypes: OwnerEventType[]; selectedEventTypeId: string } {
  const normalizedEventType = {
    title: form.title.trim(),
    description: form.description.trim(),
    durationMinutes: Number(form.durationMinutes),
  };

  if (selectedEventTypeId) {
    return {
      eventTypes: eventTypes.map((eventType) =>
        eventType.id === selectedEventTypeId ? { ...eventType, ...normalizedEventType } : eventType,
      ),
      selectedEventTypeId,
    };
  }

  const nextEventType: OwnerEventType = {
    id: createOwnerEventTypeId(normalizedEventType.title, eventTypes),
    isArchived: false,
    hasBookings: false,
    ...normalizedEventType,
  };

  return {
    eventTypes: [nextEventType, ...eventTypes],
    selectedEventTypeId: nextEventType.id,
  };
}

export function archiveOwnerEventType(
  eventTypes: OwnerEventType[],
  eventTypeId: string,
): OwnerEventType[] {
  return eventTypes.map((eventType) =>
    eventType.id === eventTypeId ? { ...eventType, isArchived: true } : eventType,
  );
}

export function deleteOwnerEventType(
  eventTypes: OwnerEventType[],
  eventTypeId: string,
): OwnerEventType[] {
  return eventTypes.filter((eventType) => eventType.id !== eventTypeId);
}

function createOwnerEventTypeId(title: string, eventTypes: OwnerEventType[]): string {
  const baseId =
    title
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "event-type";
  let candidateId = baseId;
  let suffix = 2;

  while (eventTypes.some((eventType) => eventType.id === candidateId)) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}
