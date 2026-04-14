import { useEffect, useState } from "react";

import {
  ALL_EVENT_TYPES_FILTER,
  buildCalendarDaySummaries,
  listBookingsForDate,
} from "../lib/publicBookings";
import type { CalendarDay } from "../lib/publicCalendar";
import type { AvailableDatesByEventType, Booking, EventType, Workspace } from "../types";
import { WorkspaceHero } from "./WorkspaceHero";

type PublicBookingsHomeProps = {
  bookings: Booking[];
  eventTypes: EventType[];
  availableDatesByEventType: AvailableDatesByEventType;
  calendarDays: CalendarDay[];
  initialSelectedDate?: string;
  initialSelectedEventTypeId?: string;
  startupWarning?: string;
  bookingsState?: "loading" | "ready" | "error";
  availabilityState?: "idle" | "loading" | "ready" | "error";
  bookingEntryDisabledReason?: string;
  isRetryingStartup?: boolean;
  workspace: Workspace;
  onChangeWorkspace: (workspace: Workspace) => void;
  onRetryStartup?: () => void;
  onOpenEventTypes?: () => void;
  onCancelBooking: (bookingId: string) => void;
  onStartBooking: (context: { isoDate: string; eventTypeId?: string }) => void;
};

function formatInterval(startAt: string, endAt: string): string {
  return `${startAt.slice(11, 16)} - ${endAt.slice(11, 16)}`;
}

function formatDuration(durationMinutes: number): string {
  return `${durationMinutes} мин`;
}

export function PublicBookingsHome({
  bookings,
  eventTypes,
  availableDatesByEventType,
  calendarDays,
  initialSelectedDate,
  initialSelectedEventTypeId,
  startupWarning,
  bookingsState = "ready",
  availabilityState = "ready",
  bookingEntryDisabledReason,
  isRetryingStartup = false,
  workspace,
  onChangeWorkspace,
  onRetryStartup,
  onOpenEventTypes,
  onCancelBooking,
  onStartBooking,
}: PublicBookingsHomeProps) {
  const [selectedFilterId, setSelectedFilterId] = useState(
    initialSelectedEventTypeId ?? ALL_EVENT_TYPES_FILTER,
  );
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate ?? calendarDays[0]?.isoDate ?? "");

  useEffect(() => {
    if (
      selectedFilterId !== ALL_EVENT_TYPES_FILTER &&
      !eventTypes.some((eventType) => eventType.id === selectedFilterId)
    ) {
      setSelectedFilterId(ALL_EVENT_TYPES_FILTER);
    }
  }, [eventTypes, selectedFilterId]);

  useEffect(() => {
    if (!initialSelectedEventTypeId) {
      return;
    }

    setSelectedFilterId((currentFilterId) =>
      currentFilterId === initialSelectedEventTypeId ? currentFilterId : initialSelectedEventTypeId,
    );
  }, [initialSelectedEventTypeId]);

  useEffect(() => {
    const hasInitialSelectedDate = Boolean(
      initialSelectedDate && calendarDays.some((day) => day.isoDate === initialSelectedDate),
    );
    const nextSelectedDate =
      hasInitialSelectedDate ? initialSelectedDate : calendarDays[0]?.isoDate ?? "";

    setSelectedDate((currentDate) => {
      if (hasInitialSelectedDate) {
        return nextSelectedDate;
      }

      return calendarDays.some((day) => day.isoDate === currentDate) ? currentDate : nextSelectedDate;
    });
  }, [calendarDays, initialSelectedDate]);

  const daySummaries = buildCalendarDaySummaries(
    calendarDays,
    bookings,
    availableDatesByEventType,
    selectedFilterId,
  );
  const selectedDay = daySummaries.find((day) => day.isoDate === selectedDate) ?? daySummaries[0];
  const selectedDayBookings = selectedDay ? listBookingsForDate(bookings, selectedDay.isoDate) : [];
  const selectedDayEventType = eventTypes.find((eventType) => eventType.id === selectedFilterId);
  const selectedDayFreeCount =
    selectedFilterId === ALL_EVENT_TYPES_FILTER || !selectedDay
      ? undefined
      : (availableDatesByEventType[selectedFilterId] ?? []).find(
          (day) => day.isoDate === selectedDay.isoDate,
        )?.slots.length ?? 0;
  const isBookingEntryDisabled = Boolean(bookingEntryDisabledReason);
  const isBookingsKnown = bookingsState === "ready";
  const isAvailabilityKnown = availabilityState === "ready";
  const showsMissingEventTypesOnboarding =
    eventTypes.length === 0 && !startupWarning && bookingsState !== "loading" && availabilityState !== "loading";

  return (
    <section className="workspace-page bookings-home">
      <WorkspaceHero
        eyebrow="Call Planner"
        title="Бронирования"
        description="Публичный календарь всех встреч на ближайшие 14 дней. В этой учебной версии детали встреч и отмена доступны без авторизации."
        workspace={workspace}
        onChangeWorkspace={onChangeWorkspace}
        className="workspace-hero--public"
        navAriaLabel="Разделы приложения"
      />

      {startupWarning ? (
        <section className="availability-note bookings-home__warning" role="alert">
          <div>
            <strong>Часть данных не удалось загрузить.</strong>
            <p className="bookings-home__warning-copy">{startupWarning}</p>
          </div>
          {onRetryStartup ? (
            <button
              type="button"
              className="secondary-button bookings-home__warning-action"
              disabled={isRetryingStartup}
              onClick={onRetryStartup}
            >
              {isRetryingStartup ? "Повторяем загрузку..." : "Повторить загрузку"}
            </button>
          ) : null}
        </section>
      ) : null}

      {showsMissingEventTypesOnboarding ? (
        <section className="bookings-card bookings-home__empty-state">
          <div>
            <p className="bookings-card__eyebrow">Подготовка календаря</p>
            <h2>Добавьте тип события, чтобы открыть запись</h2>
          </div>
          <p className="panel-copy bookings-home__empty-copy">
            Пока у календаря нет активных типов событий, гости не смогут выбрать встречу и записаться
            на свободный слот.
          </p>
          <div className="bookings-home__empty-actions">
            <button
              type="button"
              className="primary-button"
              onClick={onOpenEventTypes ?? (() => onChangeWorkspace("owner-event-types"))}
            >
              Перейти к типам событий
            </button>
          </div>
        </section>
      ) : (
        <>
      <div className="filter-row" role="toolbar" aria-label="Фильтр по типу встречи">
        <button
          type="button"
          className={`filter-chip${selectedFilterId === ALL_EVENT_TYPES_FILTER ? " filter-chip--active" : ""}`}
          onClick={() => setSelectedFilterId(ALL_EVENT_TYPES_FILTER)}
        >
          Все
        </button>
        {eventTypes.map((eventType) => {
          const freeCountForDay = selectedDay
            ? (availableDatesByEventType[eventType.id] ?? []).find(
                (day) => day.isoDate === selectedDay.isoDate,
              )?.slots.length ?? 0
            : 0;
          const bookedCountForDay = selectedDayBookings.filter(
            (booking) => booking.eventTypeId === eventType.id,
          ).length;
          const isRelevantForDay =
            !isBookingsKnown || !isAvailabilityKnown || freeCountForDay > 0 || bookedCountForDay > 0;
          const selected = selectedFilterId === eventType.id;

          return (
            <button
              key={eventType.id}
              type="button"
              className={`filter-chip${selected ? " filter-chip--active" : ""}`}
              aria-label={`${eventType.title}, ${formatDuration(eventType.durationMinutes)}`}
              disabled={!selected && !isRelevantForDay}
              onClick={() => setSelectedFilterId(eventType.id)}
            >
              <span className="filter-chip__label">
                <span className="filter-chip__meta">{formatDuration(eventType.durationMinutes)}</span>
                <span className="filter-chip__title">{eventType.title}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="bookings-home__layout">
        <section className="bookings-card">
          <div className="bookings-card__header">
            <p className="bookings-card__eyebrow">Календарь</p>
            <p className="bookings-card__caption">
              {!isBookingsKnown
                ? "Статус занятых слотов временно недоступен."
                : !isAvailabilityKnown && selectedFilterId !== ALL_EVENT_TYPES_FILTER
                  ? "Занятые слоты показаны, свободные слоты уточняются."
                  : selectedFilterId === ALL_EVENT_TYPES_FILTER
                ? "Показаны только занятые слоты."
                : "Показаны занятые и свободные слоты."}
            </p>
          </div>

          <div className="booking-calendar-grid">
            {daySummaries.map((day) => {
              const selected = day.isoDate === selectedDay?.isoDate;
              const noFreeSlots =
                selectedFilterId !== ALL_EVENT_TYPES_FILTER &&
                isAvailabilityKnown &&
                (day.freeCount ?? 0) === 0;

              return (
                <button
                  key={day.isoDate}
                  type="button"
                  aria-label={day.fullLabel}
                  className={[
                    "booking-calendar-day",
                    selected ? "booking-calendar-day--selected" : "",
                    day.bookedCount > 0 ? "booking-calendar-day--booked" : "",
                    noFreeSlots ? "booking-calendar-day--full" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setSelectedDate(day.isoDate)}
                >
                  <span className="booking-calendar-day__weekday">{day.weekdayShort}</span>
                  <span className="booking-calendar-day__number">{day.dayNumber}</span>
                  <span className="booking-calendar-day__meta">
                    {isBookingsKnown ? (
                      <strong>{day.bookedCount} занято</strong>
                    ) : (
                      <strong>
                        {bookingsState === "loading"
                          ? "Бронирования загружаются"
                            : "—"}
                      </strong>
                    )}
                    {selectedFilterId === ALL_EVENT_TYPES_FILTER ? null : isAvailabilityKnown ? (
                      <span>{day.freeCount} свободно</span>
                    ) : (
                      <span>
                        {availabilityState === "loading"
                          ? "Слоты загружаются"
                          : "Слоты уточняются"}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="bookings-card bookings-card--detail">
          <div className="day-panel__header">
            <div>
              <p className="bookings-card__eyebrow">Выбранный день</p>
              <h2>{selectedDay?.fullLabel}</h2>
            </div>
            <button
              type="button"
              className="primary-button"
              aria-describedby={isBookingEntryDisabled ? "booking-entry-guard" : undefined}
              disabled={isBookingEntryDisabled}
              onClick={() =>
                selectedDay &&
                onStartBooking({
                  isoDate: selectedDay.isoDate,
                  eventTypeId:
                    selectedFilterId === ALL_EVENT_TYPES_FILTER ? undefined : selectedFilterId,
                })
              }
            >
              Записаться
            </button>
          </div>

          {bookingEntryDisabledReason ? (
            <p id="booking-entry-guard" className="availability-note">
              {bookingEntryDisabledReason}
            </p>
          ) : selectedDayEventType && isAvailabilityKnown && selectedDayFreeCount === 0 ? (
            <p className="availability-note">
              Для встречи «{selectedDayEventType.title}» на этот день свободных слотов нет.
            </p>
          ) : null}

          {!isBookingsKnown ? (
            <div className="day-panel__empty">
              <p>
                {bookingsState === "loading"
                  ? "Загружаем публичные бронирования для выбранной даты."
                  : "Не удалось загрузить публичные бронирования для выбранной даты."}
              </p>
              <p>
                {bookingsState === "loading"
                  ? "Список встреч появится после завершения загрузки."
                  : "Повторите попытку позже или обновите данные через предупреждение выше."}
              </p>
            </div>
          ) : selectedDayBookings.length === 0 ? (
            <div className="day-panel__empty">
              <p>На выбранную дату публичных бронирований пока нет.</p>
              <p>Можно сразу открыть форму записи и выбрать подходящий слот.</p>
            </div>
          ) : (
            <div className="booking-list">
              {selectedDayBookings.map((booking) => {
                const eventType = eventTypes.find((item) => item.id === booking.eventTypeId);

                return (
                  <article key={booking.id} className="booking-card">
                    <div className="booking-card__row">
                      <div>
                        <p className="booking-card__title">{eventType?.title ?? "Встреча"}</p>
                        <p className="booking-card__meta">
                          {selectedDay?.fullLabel} • {formatInterval(booking.startAt, booking.endAt)}
                        </p>
                      </div>
                      <span
                        className={`status-pill${booking.status === "cancelled" ? " status-pill--cancelled" : ""}`}
                      >
                        {booking.status === "active" ? "Активно" : "Отменено"}
                      </span>
                    </div>

                    <div className="booking-card__guest">
                      <span>{booking.guestName}</span>
                      <span>{booking.guestEmail}</span>
                    </div>

                    {booking.status === "active" ? (
                      <button
                        type="button"
                        className="secondary-button booking-card__action"
                        onClick={() => onCancelBooking(booking.id)}
                      >
                        Отменить
                      </button>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
        </>
      )}
    </section>
  );
}
