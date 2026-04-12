import type { OwnerEventType, OwnerEventTypeForm, OwnerEventTypeInput } from "../types";

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
    description: eventType.description ?? "",
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

export function buildOwnerEventTypeInput(form: OwnerEventTypeForm): OwnerEventTypeInput {
  return {
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    durationMinutes: Number(form.durationMinutes),
  };
}
