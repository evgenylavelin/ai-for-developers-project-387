import { useEffect, useState } from "react";

import {
  buildProgressSteps,
  buildStepSummaryParts,
  deriveEntryState,
  formatSummary,
} from "../lib/guestFlow";
import type { AvailableDatesByEventType, BookingDraft, EventType, SlotDate } from "../types";
import { ContactsStep } from "./ContactsStep";
import { DateTimeStep } from "./DateTimeStep";
import { EmptyState } from "./EmptyState";
import { EventTypeStep } from "./EventTypeStep";
import { ProgressSteps } from "./ProgressSteps";
import { SelectionSummary } from "./SelectionSummary";
import { SuccessState } from "./SuccessState";

type GuestBookingPageProps = {
  eventTypes: EventType[];
  datesByEventType: AvailableDatesByEventType;
  initialSelectedDate?: string;
  initialSelectedEventTypeId?: string;
  successActionLabel?: string;
  onBookingSubmit?: (draft: BookingDraft) => Promise<void>;
  onSuccessAction?: () => void;
  onExit?: () => void;
};

function resolveDates(
  entryState: ReturnType<typeof deriveEntryState>,
  datesByEventType: AvailableDatesByEventType,
  selectedEventTypeId: string,
): SlotDate[] {
  if (entryState.kind === "direct-booking") {
    return datesByEventType[entryState.presetEventType.id] ?? [];
  }

  return selectedEventTypeId ? datesByEventType[selectedEventTypeId] ?? [] : [];
}

export function GuestBookingPage({
  eventTypes,
  datesByEventType,
  initialSelectedDate,
  initialSelectedEventTypeId,
  successActionLabel,
  onBookingSubmit,
  onSuccessAction,
  onExit,
}: GuestBookingPageProps) {
  const entryState = deriveEntryState(eventTypes, initialSelectedEventTypeId);
  const isThreeStepFlow =
    entryState.kind === "choose-event-type" || entryState.kind === "prefilled-public-booking";
  const startsOnDateTime =
    entryState.kind === "direct-booking" || entryState.kind === "prefilled-public-booking";
  const [currentScreen, setCurrentScreen] = useState<
    "event-type" | "date-time" | "contacts" | "success"
  >(startsOnDateTime ? "date-time" : "event-type");
  const [selectedEventTypeId, setSelectedEventTypeId] = useState(
    entryState.kind === "direct-booking" || entryState.kind === "prefilled-public-booking"
      ? entryState.presetEventType.id
      : "",
  );
  const currentDates = resolveDates(entryState, datesByEventType, selectedEventTypeId);
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate ?? currentDates[0]?.isoDate ?? "");
  const [selectedTime, setSelectedTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successSummary, setSuccessSummary] = useState("");

  useEffect(() => {
    const preferredDate =
      initialSelectedDate && currentDates.some((date) => date.isoDate === initialSelectedDate)
        ? initialSelectedDate
        : currentDates[0]?.isoDate ?? "";
    const nextSelectedDate = currentDates.some((date) => date.isoDate === selectedDate)
      ? selectedDate
      : preferredDate;

    if (nextSelectedDate !== selectedDate) {
      setSelectedDate(nextSelectedDate);
    }

    const activeDate = currentDates.find((date) => date.isoDate === nextSelectedDate);
    const hasSelectedTime = activeDate?.slots.includes(selectedTime) ?? false;

    if (!hasSelectedTime && selectedTime) {
      setSelectedTime("");
    }
  }, [currentDates, initialSelectedDate, selectedDate, selectedTime]);

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

    if (entryState.kind === "choose-event-type" || entryState.kind === "prefilled-public-booking") {
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
  const activeDate = currentDates.find((date) => date.isoDate === selectedDate) ?? currentDates[0];
  const fullSummary = formatSummary({
    eventTypeTitle: selectedEventType?.title,
    fullDateLabel: activeDate?.fullLabel,
    timeLabel: selectedTime || undefined,
  });
  const summaryParts =
    currentScreen === "event-type"
      ? []
      : currentScreen === "date-time"
        ? isThreeStepFlow && selectedEventType?.title
          ? [selectedEventType.title]
          : []
        : buildStepSummaryParts({
            eventTypeTitle: selectedEventType?.title,
            fullDateLabel: activeDate?.fullLabel,
            timeLabel: selectedTime || undefined,
          });
  const restartBookingFlow = () => {
    setSelectedEventTypeId(
      entryState.kind === "direct-booking" || entryState.kind === "prefilled-public-booking"
        ? entryState.presetEventType.id
        : "",
    );
    const nextDates = resolveDates(
      entryState,
      datesByEventType,
      entryState.kind === "direct-booking" || entryState.kind === "prefilled-public-booking"
        ? entryState.presetEventType.id
        : "",
    );
    const nextSelectedDate =
      initialSelectedDate && nextDates.some((date) => date.isoDate === initialSelectedDate)
        ? initialSelectedDate
        : nextDates[0]?.isoDate ?? "";

    setSelectedDate(nextSelectedDate);
    setSelectedTime("");
    setName("");
    setEmail("");
    setSuccessSummary("");
    setSubmissionError("");
    setIsSubmitting(false);
    setCurrentScreen(startsOnDateTime ? "date-time" : "event-type");
  };

  if (currentScreen === "success") {
    return (
      <SuccessState
        actionLabel={successActionLabel}
        summary={successSummary || fullSummary}
        onAction={onSuccessAction ?? restartBookingFlow}
      />
    );
  }

  const activeIndex =
    currentScreen === "event-type"
      ? 0
      : currentScreen === "date-time"
        ? isThreeStepFlow
          ? 1
          : 0
        : isThreeStepFlow
          ? 2
          : 1;
  const canContinue =
    currentScreen === "event-type" ? Boolean(selectedEventTypeId) : Boolean(selectedTime);
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
  const handleBack = () => {
    setSubmissionError("");

    if (currentScreen === "contacts") {
      setCurrentScreen("date-time");
      return;
    }

    if (currentScreen === "date-time") {
      if (isThreeStepFlow) {
        setCurrentScreen("event-type");
        return;
      }

      onExit?.();
      return;
    }

    onExit?.();
  };

  const submit = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !selectedEventType || !selectedDate || !selectedTime) {
      setSubmissionError("Заполните имя и email, чтобы подтвердить бронирование.");
      return;
    }

    const draft = {
      eventTypeId: selectedEventType.id,
      isoDate: selectedDate,
      time: selectedTime,
      guestName: trimmedName,
      guestEmail: trimmedEmail,
    };

    setSubmissionError("");
    setIsSubmitting(true);

    try {
      await onBookingSubmit?.(draft);
      setSuccessSummary(
        formatSummary({
          eventTypeTitle: selectedEventType.title,
          fullDateLabel: activeDate?.fullLabel,
          timeLabel: selectedTime,
        }),
      );
      setCurrentScreen("success");
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : "Не удалось создать бронирование.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="panel">
      <p className="eyebrow">Call Planner</p>
      <ProgressSteps steps={steps} activeIndex={activeIndex} />
      <SelectionSummary values={summaryParts} />
      <h1>{heading}</h1>
      <p className="panel-copy">{copy}</p>
      {currentScreen === "event-type" ? (
        <EventTypeStep
          eventTypes={eventTypes}
          selectedEventTypeId={selectedEventTypeId}
          onSelect={(eventTypeId) => {
            const didEventTypeChange = eventTypeId !== selectedEventTypeId;

            setSelectedEventTypeId(eventTypeId);
            setSubmissionError("");

            if (!didEventTypeChange) {
              return;
            }

            const nextDates = datesByEventType[eventTypeId] ?? [];
            const nextSelectedDate =
              initialSelectedDate && nextDates.some((date) => date.isoDate === initialSelectedDate)
                ? initialSelectedDate
                : nextDates[0]?.isoDate ?? "";

            setSelectedDate(nextSelectedDate);
            setSelectedTime("");
          }}
        />
      ) : currentScreen === "date-time" ? (
        <DateTimeStep
          dates={currentDates}
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
        <button type="button" className="secondary-button" onClick={handleBack}>
          Назад
        </button>
        {currentScreen === "contacts" ? (
          <button type="button" className="primary-button" disabled={isSubmitting} onClick={() => void submit()}>
            {isSubmitting ? "Сохраняем..." : "Подтвердить"}
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
