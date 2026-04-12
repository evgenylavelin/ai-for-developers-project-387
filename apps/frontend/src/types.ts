export type EventType = {
  id: string;
  title: string;
  durationMinutes: number;
  note?: string;
};

export type SlotDate = {
  isoDate: string;
  weekdayShort: string;
  dayNumber: string;
  fullLabel: string;
  slots: string[];
};

export type EntryStateKind =
  | "unavailable"
  | "direct-booking"
  | "choose-event-type";

export type UnavailableEntryState = {
  kind: "unavailable";
};

export type DirectBookingEntryState = {
  kind: "direct-booking";
  presetEventType: EventType;
};

export type ChooseEventTypeEntryState = {
  kind: "choose-event-type";
};

export type EntryState =
  | UnavailableEntryState
  | DirectBookingEntryState
  | ChooseEventTypeEntryState;

export type GuestFlowSummary = {
  eventTypeTitle?: string;
  fullDateLabel?: string;
  timeLabel?: string;
};
