import type { EventType } from "../types";

type EventTypeStepProps = {
  eventTypes: EventType[];
  selectedEventTypeId?: string;
  onSelect: (eventTypeId: string) => void;
};

export function EventTypeStep({
  eventTypes,
  selectedEventTypeId,
  onSelect,
}: EventTypeStepProps) {
  return (
    <div className="stack">
      {eventTypes.map((eventType) => {
        const selected = eventType.id === selectedEventTypeId;

        return (
          <button
            key={eventType.id}
            type="button"
            aria-label={eventType.title}
            className={`choice-card${selected ? " choice-card--selected" : ""}`}
            onClick={() => onSelect(eventType.id)}
          >
            <span>{eventType.title}</span>
            <span>{eventType.durationMinutes} минут</span>
          </button>
        );
      })}
    </div>
  );
}
