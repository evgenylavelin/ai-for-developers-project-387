import type { SlotDate } from "../types";

type DateTimeStepProps = {
  dates: SlotDate[];
  selectedDate?: string;
  selectedTime?: string;
  onSelectDate: (isoDate: string) => void;
  onSelectTime: (time: string) => void;
};

export function DateTimeStep({
  dates,
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
}: DateTimeStepProps) {
  if (dates.length === 0) {
    return (
      <div className="stack">
        <p className="empty-copy">Свободные даты пока недоступны. Попробуйте позже.</p>
      </div>
    );
  }

  const activeDate = dates.find((date) => date.isoDate === selectedDate) ?? dates[0];

  return (
    <div className="stack">
      <div className="calendar-grid">
        {dates.map((date) => {
          const active = date.isoDate === activeDate.isoDate;

          return (
            <button
              key={date.isoDate}
              type="button"
              className={`calendar-day${active ? " calendar-day--selected" : ""}`}
              onClick={() => onSelectDate(date.isoDate)}
            >
              <span>{date.weekdayShort}</span>
              <span>{date.dayNumber}</span>
            </button>
          );
        })}
      </div>

      <p className="slot-date-label">{activeDate.fullLabel}</p>

      {activeDate.slots.length === 0 ? (
        <p className="empty-copy">
          На выбранный день свободных слотов нет. Выберите другую дату.
        </p>
      ) : (
        <div className="slot-grid">
          {activeDate.slots.map((slot) => (
            <button
              key={slot}
              type="button"
              className={`slot-button${slot === selectedTime ? " slot-button--selected" : ""}`}
              onClick={() => onSelectTime(slot)}
            >
              {slot}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
