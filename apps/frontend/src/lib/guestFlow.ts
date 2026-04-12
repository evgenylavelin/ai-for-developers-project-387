import type {
  EntryState,
  EntryStateKind,
  EventType,
  GuestFlowSummary,
} from "../types";

export function deriveEntryState(eventTypes: EventType[]): EntryState {
  if (eventTypes.length === 0) {
    return { kind: "unavailable" };
  }

  if (eventTypes.length === 1) {
    return {
      kind: "direct-booking",
      presetEventType: eventTypes[0],
    };
  }

  return { kind: "choose-event-type" };
}

export function buildProgressSteps(kind: EntryStateKind): string[] {
  if (kind === "direct-booking") {
    return ["Дата и время", "Контакты"];
  }

  if (kind === "choose-event-type") {
    return ["Тип встречи", "Дата и время", "Контакты"];
  }

  return [];
}

export function formatSummary(summary: GuestFlowSummary): string {
  return [summary.eventTypeTitle, summary.fullDateLabel, summary.timeLabel]
    .filter(Boolean)
    .join(" • ");
}
