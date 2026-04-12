import { useEffect, useState } from "react";

import { buildProgressSteps, deriveEntryState, formatSummary } from "../lib/guestFlow";
import type { EventType, SlotDate } from "../types";
import { ContactsStep } from "./ContactsStep";
import { DateTimeStep } from "./DateTimeStep";
import { EmptyState } from "./EmptyState";
import { EventTypeStep } from "./EventTypeStep";
import { ProgressSteps } from "./ProgressSteps";
import { SelectionSummary } from "./SelectionSummary";
import { SuccessState } from "./SuccessState";

type GuestBookingPageProps = {
  eventTypes: EventType[];
  dates: SlotDate[];
};

export function GuestBookingPage({ eventTypes, dates }: GuestBookingPageProps) {
  const entryState = deriveEntryState(eventTypes);
  const startsWithEventType = entryState.kind === "choose-event-type";
  const [currentScreen, setCurrentScreen] = useState<
    "event-type" | "date-time" | "contacts" | "success"
  >(startsWithEventType ? "event-type" : "date-time");
  const [selectedEventTypeId, setSelectedEventTypeId] = useState(
    entryState.kind === "direct-booking" ? entryState.presetEventType.id : "",
  );
  const [selectedDate, setSelectedDate] = useState(dates[0]?.isoDate ?? "");
  const [selectedTime, setSelectedTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submissionError, setSubmissionError] = useState("");

  useEffect(() => {
    const nextSelectedDate = dates.some((date) => date.isoDate === selectedDate)
      ? selectedDate
      : dates[0]?.isoDate ?? "";

    if (nextSelectedDate !== selectedDate) {
      setSelectedDate(nextSelectedDate);
    }

    const activeDate = dates.find((date) => date.isoDate === nextSelectedDate);
    const hasSelectedTime = activeDate?.slots.includes(selectedTime) ?? false;

    if (!hasSelectedTime && selectedTime) {
      setSelectedTime("");
    }
  }, [dates, selectedDate, selectedTime]);

  useEffect(() => {
    if (entryState.kind === "direct-booking") {
      if (selectedEventTypeId !== entryState.presetEventType.id) {
        setSelectedEventTypeId(entryState.presetEventType.id);
      }
      if (currentScreen === "event-type") {
        setCurrentScreen("date-time");
      }
      return;
    }

    if (entryState.kind === "choose-event-type") {
      const eventTypeExists = eventTypes.some((eventType) => eventType.id === selectedEventTypeId);

      if (!eventTypeExists && selectedEventTypeId) {
        setSelectedEventTypeId("");
      }
      if (!eventTypeExists && currentScreen !== "event-type") {
        setCurrentScreen("event-type");
      }
    }
  }, [currentScreen, entryState, eventTypes, selectedEventTypeId]);

  if (entryState.kind === "unavailable") {
    return <EmptyState />;
  }

  const steps = buildProgressSteps(entryState.kind);
  const selectedEventType = eventTypes.find((eventType) => eventType.id === selectedEventTypeId);
  const activeDate = dates.find((date) => date.isoDate === selectedDate) ?? dates[0];
  const fullSummary = formatSummary({
    eventTypeTitle: selectedEventType?.title,
    fullDateLabel: activeDate?.fullLabel,
    timeLabel: selectedTime || undefined,
  });
  const summary =
    currentScreen === "event-type"
      ? ""
      : currentScreen === "date-time" && !selectedTime
        ? selectedEventType?.title ?? ""
        : fullSummary;

  if (currentScreen === "success") {
    return <SuccessState summary={fullSummary} />;
  }

  const activeIndex =
    currentScreen === "event-type"
      ? 0
      : currentScreen === "date-time"
        ? startsWithEventType
          ? 1
          : 0
        : startsWithEventType
          ? 2
          : 1;
  const canContinue =
    currentScreen === "event-type" ? Boolean(selectedEventTypeId) : Boolean(selectedTime);
  const canGoBack = currentScreen === "date-time" ? startsWithEventType : currentScreen === "contacts";
  const heading =
    currentScreen === "event-type"
      ? "Выберите тип встречи"
      : currentScreen === "date-time"
        ? "Выберите дату и время"
        : "Введите контактные данные";
  const copy =
    currentScreen === "event-type"
      ? "Выберите формат встречи, чтобы перейти к выбору слота."
      : currentScreen === "date-time"
        ? "Выберите свободный слот на ближайшие 14 дней."
        : "Укажите имя и email для подтверждения бронирования.";

  const submit = () => {
    if (!name.trim() || !email.trim()) {
      setSubmissionError("Заполните имя и email, чтобы подтвердить бронирование.");
      return;
    }

    setSubmissionError("");
    setCurrentScreen("success");
  };

  return (
    <section className="panel">
      <p className="eyebrow">Call Planner</p>
      <ProgressSteps steps={steps} activeIndex={activeIndex} />
      <SelectionSummary value={summary} />
      <h1>{heading}</h1>
      <p className="panel-copy">{copy}</p>
      {currentScreen === "event-type" ? (
        <EventTypeStep
          eventTypes={eventTypes}
          selectedEventTypeId={selectedEventTypeId}
          onSelect={(eventTypeId) => {
            setSelectedEventTypeId(eventTypeId);
            setSelectedDate(dates[0]?.isoDate ?? "");
            setSelectedTime("");
            setSubmissionError("");
          }}
        />
      ) : currentScreen === "date-time" ? (
        <DateTimeStep
          dates={dates}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          onSelectDate={(isoDate) => {
            setSelectedDate(isoDate);
            setSelectedTime("");
            setSubmissionError("");
          }}
          onSelectTime={(time) => {
            setSelectedTime(time);
            setSubmissionError("");
          }}
        />
      ) : (
        <ContactsStep
          name={name}
          email={email}
          error={submissionError}
          onNameChange={(value) => {
            setName(value);
            if (submissionError) {
              setSubmissionError("");
            }
          }}
          onEmailChange={(value) => {
            setEmail(value);
            if (submissionError) {
              setSubmissionError("");
            }
          }}
        />
      )}
      <div className="actions">
        {canGoBack ? (
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setSubmissionError("");
              setCurrentScreen(currentScreen === "contacts" ? "date-time" : "event-type");
            }}
          >
            Назад
          </button>
        ) : (
          <span />
        )}
        {currentScreen === "contacts" ? (
          <button type="button" className="primary-button" onClick={submit}>
            Подтвердить
          </button>
        ) : (
          <button
            type="button"
            className="primary-button"
            disabled={!canContinue}
            onClick={() => {
              setSubmissionError("");
              setCurrentScreen(currentScreen === "event-type" ? "date-time" : "contacts");
            }}
          >
            Далее
          </button>
        )}
      </div>
    </section>
  );
}
