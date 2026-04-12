import { useEffect, useState } from "react";

import {
  ALL_EVENT_TYPES_FILTER,
  buildAvailableDatesByEventType,
  buildCalendarDaySummaries,
  listBookingsForDate,
} from "../lib/publicBookings";
import type { Booking, EventType, ScheduleDay } from "../types";

type PublicBookingsHomeProps = {
  bookings: Booking[];
  eventTypes: EventType[];
  schedule: ScheduleDay[];
  initialSelectedDate?: string;
  workspace: "public" | "owner";
  onChangeWorkspace: (workspace: "public" | "owner") => void;
  onCancelBooking: (bookingId: string) => void;
  onStartBooking: (isoDate: string) => void;
};

function formatInterval(startAt: string, endAt: string): string {
  return `${startAt.slice(11, 16)} - ${endAt.slice(11, 16)}`;
}

export function PublicBookingsHome({
  bookings,
  eventTypes,
  schedule,
  initialSelectedDate,
  workspace,
  onChangeWorkspace,
  onCancelBooking,
  onStartBooking,
}: PublicBookingsHomeProps) {
  const [selectedFilterId, setSelectedFilterId] = useState(ALL_EVENT_TYPES_FILTER);
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate ?? schedule[0]?.isoDate ?? "");

  useEffect(() => {
    const nextSelectedDate =
      initialSelectedDate && schedule.some((day) => day.isoDate === initialSelectedDate)
        ? initialSelectedDate
        : schedule[0]?.isoDate ?? "";

    setSelectedDate((currentDate) =>
      schedule.some((day) => day.isoDate === currentDate) ? currentDate : nextSelectedDate,
    );
  }, [initialSelectedDate, schedule]);

  const availableDatesByEventType = buildAvailableDatesByEventType(schedule, eventTypes, bookings);
  const daySummaries = buildCalendarDaySummaries(
    schedule,
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

  return (
    <section className="bookings-home">
      <div className="bookings-home__hero">
        <div className="hero-header">
          <div>
            <p className="eyebrow">Call Planner</p>
            <h1>Бронирования</h1>
            <p className="panel-copy bookings-home__copy">
              Публичный календарь всех встреч на ближайшие 14 дней. В этой учебной версии
              детали встреч и отмена доступны без авторизации.
            </p>
          </div>

          <nav className="workspace-nav workspace-nav--embedded" aria-label="Разделы приложения">
            <button
              type="button"
              className={`workspace-nav__link${workspace === "public" ? " workspace-nav__link--active" : ""}`}
              aria-pressed={workspace === "public"}
              onClick={() => onChangeWorkspace("public")}
            >
              Бронирования
            </button>
            <button
              type="button"
              className={`workspace-nav__link${workspace === "owner" ? " workspace-nav__link--active" : ""}`}
              aria-pressed={workspace === "owner"}
              onClick={() => onChangeWorkspace("owner")}
            >
              Типы событий
            </button>
          </nav>
        </div>
      </div>

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
          const isRelevantForDay = freeCountForDay > 0 || bookedCountForDay > 0;
          const selected = selectedFilterId === eventType.id;

          return (
            <button
              key={eventType.id}
              type="button"
              className={`filter-chip${selected ? " filter-chip--active" : ""}`}
              disabled={!selected && !isRelevantForDay}
              onClick={() => setSelectedFilterId(eventType.id)}
            >
              {eventType.title}
            </button>
          );
        })}
      </div>

      <div className="bookings-home__layout">
        <section className="bookings-card">
          <div className="bookings-card__header">
            <p className="bookings-card__eyebrow">Календарь</p>
            <p className="bookings-card__caption">
              {selectedFilterId === ALL_EVENT_TYPES_FILTER
                ? "Показаны только занятые слоты."
                : "Показаны занятые и свободные слоты."}
            </p>
          </div>

          <div className="booking-calendar-grid">
            {daySummaries.map((day) => {
              const selected = day.isoDate === selectedDay?.isoDate;
              const noFreeSlots =
                selectedFilterId !== ALL_EVENT_TYPES_FILTER && (day.freeCount ?? 0) === 0;

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
                    <strong>{day.bookedCount} занято</strong>
                    {selectedFilterId === ALL_EVENT_TYPES_FILTER ? null : (
                      <span>{day.freeCount} свободно</span>
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
              onClick={() => selectedDay && onStartBooking(selectedDay.isoDate)}
            >
              Записаться
            </button>
          </div>

          {selectedDayEventType && selectedDayFreeCount === 0 ? (
            <p className="availability-note">
              Для встречи «{selectedDayEventType.title}» на этот день свободных слотов нет.
            </p>
          ) : null}

          {selectedDayBookings.length === 0 ? (
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
    </section>
  );
}