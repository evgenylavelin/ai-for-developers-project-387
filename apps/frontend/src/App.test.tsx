import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import App from "./App";
import { GuestBookingPage } from "./components/GuestBookingPage";
import { bookingSchedule, multiEventTypes, singleEventType } from "./data/mockGuestFlow";
import { buildAvailableDatesByEventType } from "./lib/publicBookings";

describe("App", () => {
  it("renders the unavailable state when there are no event types", () => {
    render(<App scenario="none" />);

    expect(
      screen.getByRole("heading", { name: "Запись пока недоступна" }),
    ).toBeInTheDocument();
  });

  it("opens the public bookings home when bookings already exist", () => {
    render(<App scenario="public" />);

    expect(screen.getByRole("heading", { name: "Бронирования" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Записаться" })).toBeInTheDocument();
    expect(screen.getByText("Иван Петров")).toBeInTheDocument();
  });

  it("requires event type selection before continuing", async () => {
    const user = userEvent.setup();

    render(<App scenario="multi" />);

    const nextButton = screen.getByRole("button", { name: "Далее" });

    expect(nextButton).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Стратегическая сессия" }));

    expect(nextButton).toBeEnabled();
  });

  it("keeps the direct booking flow as the initial screen when there are no bookings", () => {
    render(<App scenario="single" />);

    expect(
      screen.getByRole("heading", { name: "Выберите дату и время" }),
    ).toBeInTheDocument();
  });

  it("shows the selected event type above the date and time step", async () => {
    const user = userEvent.setup();

    render(<App scenario="multi" />);

    await user.click(screen.getByRole("button", { name: "Стратегическая сессия" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));

    expect(screen.getByText("Стратегическая сессия")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Выберите дату и время" }),
    ).toBeInTheDocument();
  });

  it("shows only booked counts in the public calendar when the all filter is active", () => {
    render(<App scenario="public" />);

    const selectedDay = screen.getByRole("button", { name: "Среда, 15 апреля" });

    expect(within(selectedDay).getByText("2 занято")).toBeInTheDocument();
    expect(screen.queryByText(/свободно/)).not.toBeInTheDocument();
  });

  it("shows booked and free counts after selecting a specific event type filter", async () => {
    const user = userEvent.setup();

    render(<App scenario="public" />);

    await user.click(screen.getByRole("button", { name: "Стратегическая сессия, 30 мин" }));

    const selectedDay = screen.getByRole("button", { name: "Среда, 15 апреля" });

    expect(within(selectedDay).getByText("1 занято")).toBeInTheDocument();
    expect(within(selectedDay).getByText("2 свободно")).toBeInTheDocument();
  });

  it("moves the direct-booking flow to the contacts step after selecting a slot", async () => {
    const user = userEvent.setup();

    render(<App scenario="single" />);

    await user.click(screen.getByRole("button", { name: "09:00" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));

    expect(
      screen.getByRole("heading", { name: "Введите контактные данные" }),
    ).toBeInTheDocument();

    const progressItems = within(
      screen.getByRole("list", { name: "Прогресс бронирования" }),
    ).getAllByRole("listitem");

    expect(progressItems[0]).toHaveClass("progress-step--done");
    expect(progressItems[1]).toHaveClass("progress-step--active");
  });

  it("shows compact weekdays in the booking flow and a full date above slots", () => {
    render(<App scenario="single" />);

    expect(screen.getByText("Ср")).toBeInTheDocument();
    expect(screen.getByText("3 сл.")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("Среда, 15 апреля")).toBeInTheDocument();
  });

  it("shows only the previous-step selection in the summary on the date and time step", async () => {
    const user = userEvent.setup();

    render(<App scenario="single" />);

    await user.click(screen.getByRole("button", { name: "09:00" }));

    expect(screen.queryByLabelText("Результат предыдущих шагов")).not.toBeInTheDocument();
  });

  it("shows empty-state copy when the selected date has no available slots", async () => {
    const user = userEvent.setup();

    render(<App scenario="single" />);

    await user.click(screen.getByRole("button", { name: "Вс 19" }));

    expect(
      screen.getByText("На выбранный день свободных слотов нет. Выберите другую дату."),
    ).toBeInTheDocument();
  });

  it("shows an explicit empty state for a selected public day without bookings", async () => {
    const user = userEvent.setup();

    render(<App scenario="public" />);

    await user.click(screen.getByRole("button", { name: "Суббота, 18 апреля" }));

    expect(screen.getByText("На выбранную дату публичных бронирований пока нет.")).toBeInTheDocument();
  });

  it("keeps cancelled public bookings visible after cancellation", async () => {
    const user = userEvent.setup();

    render(<App scenario="public" />);

    const bookingCard = screen.getByText("Иван Петров").closest("article");

    expect(bookingCard).not.toBeNull();

    await user.click(within(bookingCard as HTMLElement).getByRole("button", { name: "Отменить" }));

    expect(within(bookingCard as HTMLElement).getByText("Отменено")).toBeInTheDocument();
    expect(
      within(screen.getByRole("button", { name: "Среда, 15 апреля" })).getByText("1 занято"),
    ).toBeInTheDocument();
  });

  it("clears the selected time when changing the date", async () => {
    const user = userEvent.setup();

    render(<App scenario="single" />);

    await user.click(screen.getByRole("button", { name: "09:00" }));
    await user.click(screen.getByRole("button", { name: "Вс 19" }));

    expect(screen.queryByLabelText("Результат предыдущих шагов")).not.toBeInTheDocument();
    expect(
      screen.getByText("На выбранный день свободных слотов нет. Выберите другую дату."),
    ).toBeInTheDocument();
  });

  it("reconciles selected date and time when GuestBookingPage receives new dates", async () => {
    const user = userEvent.setup();

    const initialDates = {
      standard: [
        {
          isoDate: "2026-04-15",
          weekdayShort: "Ср",
          dayNumber: "15",
          fullLabel: "Среда, 15 апреля",
          slots: ["09:00", "10:30"],
        },
        {
          isoDate: "2026-04-16",
          weekdayShort: "Чт",
          dayNumber: "16",
          fullLabel: "Четверг, 16 апреля",
          slots: [],
        },
      ],
    };
    const nextDates = {
      standard: [
        {
          isoDate: "2026-04-18",
          weekdayShort: "Сб",
          dayNumber: "18",
          fullLabel: "Суббота, 18 апреля",
          slots: ["14:00"],
        },
      ],
    };

    const { rerender } = render(
      <GuestBookingPage eventTypes={singleEventType} datesByEventType={initialDates} />,
    );

    await user.click(screen.getByRole("button", { name: "09:00" }));

    rerender(<GuestBookingPage eventTypes={singleEventType} datesByEventType={nextDates} />);

    expect(screen.getByText("Суббота, 18 апреля")).toBeInTheDocument();
    expect(screen.queryByLabelText("Результат предыдущих шагов")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Далее" })).toBeDisabled();
  });

  it("clears date and time selection after changing the event type", async () => {
    const user = userEvent.setup();
    const datesByEventType = buildAvailableDatesByEventType(bookingSchedule, multiEventTypes, []);

    render(<GuestBookingPage eventTypes={multiEventTypes} datesByEventType={datesByEventType} />);

    await user.click(screen.getByRole("button", { name: "Стратегическая сессия" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));
    await user.click(screen.getByRole("button", { name: "09:00" }));

    expect(within(screen.getByLabelText("Результат предыдущих шагов")).getByText("Стратегическая сессия")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Назад" }));
    await user.click(screen.getByRole("button", { name: "Короткий созвон" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));

    expect(screen.getByText("Короткий созвон")).toBeInTheDocument();
    expect(
      within(screen.getByLabelText("Результат предыдущих шагов")).queryByText(
        "Среда, 15 апреля • 09:00",
      ),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Далее" })).toBeDisabled();
  });

  it("shows explicit empty step state when GuestBookingPage receives no dates", () => {
    render(<GuestBookingPage eventTypes={singleEventType} datesByEventType={{ standard: [] }} />);

    expect(
      screen.getByText("Свободные даты пока недоступны. Попробуйте позже."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Далее" })).toBeDisabled();
  });

  it("shows the selected event type, full date, and time on the contacts step", async () => {
    const user = userEvent.setup();

    render(<App scenario="single" />);

    await user.click(screen.getByRole("button", { name: "10:30" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));

    expect(
      within(screen.getByLabelText("Результат предыдущих шагов")).getByText(
        "Среда, 15 апреля • 10:30",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Подтвердить" })).toBeInTheDocument();
  });

  it("opens the booking flow from the public home with the selected date preserved", async () => {
    const user = userEvent.setup();

    render(<App scenario="public" />);

    await user.click(screen.getByRole("button", { name: "Пятница, 17 апреля" }));
    await user.click(screen.getByRole("button", { name: "Записаться" }));
    await user.click(screen.getByRole("button", { name: "Стратегическая сессия" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));

    expect(screen.getByText("Пятница, 17 апреля")).toBeInTheDocument();
  });

  it("shows an inline error when contact data is incomplete", async () => {
    const user = userEvent.setup();

    render(<App scenario="single" />);

    await user.click(screen.getByRole("button", { name: "10:30" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));

    expect(
      screen.getByText("Заполните имя и email, чтобы подтвердить бронирование."),
    ).toBeInTheDocument();
  });

  it("shows the success screen after valid contact submission", async () => {
    const user = userEvent.setup();

    render(<App scenario="single" />);

    await user.click(screen.getByRole("button", { name: "10:30" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));
    await user.type(screen.getByLabelText("Имя"), "Иван");
    await user.type(screen.getByLabelText("Email"), "ivan@example.com");
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));

    expect(
      screen.getByRole("heading", { name: "Бронирование подтверждено" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Детали встречи сохранены.")).toBeInTheDocument();
    expect(screen.getByText("Стратегическая сессия • Среда, 15 апреля • 10:30")).toBeInTheDocument();
  });

  it("returns from the success screen back to public bookings and shows the new booking", async () => {
    const user = userEvent.setup();

    render(<App scenario="public" />);

    await user.click(screen.getByRole("button", { name: "Пятница, 17 апреля" }));
    await user.click(screen.getByRole("button", { name: "Записаться" }));
    await user.click(screen.getByRole("button", { name: "Стратегическая сессия" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));
    await user.click(screen.getByRole("button", { name: "09:00" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));
    await user.type(screen.getByLabelText("Имя"), "Мария");
    await user.type(screen.getByLabelText("Email"), "maria@example.com");
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));
    await user.click(screen.getByRole("button", { name: "Вернуться к бронированиям" }));

    expect(screen.getByRole("heading", { name: "Бронирования" })).toBeInTheDocument();
    expect(screen.getByText("Пятница, 17 апреля")).toBeInTheDocument();
    expect(screen.getByText("Мария")).toBeInTheDocument();
  });

  it("returns to the beginning from the success screen", async () => {
    const user = userEvent.setup();

    render(<App scenario="multi" />);

    await user.click(screen.getByRole("button", { name: "Стратегическая сессия" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));
    await user.click(screen.getByRole("button", { name: "09:00" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));
    await user.type(screen.getByLabelText("Имя"), "Иван");
    await user.type(screen.getByLabelText("Email"), "ivan@example.com");
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));
    await user.click(screen.getByRole("button", { name: "Вернуться в начало" }));

    expect(screen.getByRole("heading", { name: "Выберите тип встречи" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Далее" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Стратегическая сессия" })).not.toHaveClass(
      "choice-card--selected",
    );
  });

  it("navigates from public bookings to the owner workspace and back", async () => {
    const user = userEvent.setup();

    render(<App scenario="public" />);

    expect(screen.getByRole("heading", { name: "Бронирования" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Типы событий" }));

    expect(screen.getByRole("heading", { name: "Управление типами событий" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Редактирование типа события" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Бронирования" }));

    expect(screen.getByRole("heading", { name: "Бронирования" })).toBeInTheDocument();
  });

  it('opens create mode from "+ Создать тип события" with empty fields and no destructive actions', async () => {
    const user = userEvent.setup();

    render(<App scenario="public" />);

    await user.click(screen.getByRole("button", { name: "Типы событий" }));
    await user.click(screen.getByRole("button", { name: "+ Создать тип события" }));

    expect(screen.getByRole("heading", { name: "Новый тип события" })).toBeInTheDocument();
    expect(screen.getByLabelText("Название")).toHaveValue("");
    expect(screen.getByLabelText("Описание")).toHaveValue("");
    expect(screen.getByLabelText("Длительность")).toHaveValue(null);
    expect(screen.queryByRole("button", { name: "Удалить" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Архивировать" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Подтвердить удаление|Подтвердить архивирование/)).not.toBeInTheDocument();
  });

  it("saves a new owner event type into the local list state", async () => {
    const user = userEvent.setup();

    render(<App scenario="public" />);

    await user.click(screen.getByRole("button", { name: "Типы событий" }));
    await user.click(screen.getByRole("button", { name: "+ Создать тип события" }));
    await user.type(screen.getByLabelText("Название"), "Новая диагностика");
    await user.type(
      screen.getByLabelText("Описание"),
      "Проверка текущего состояния и следующих шагов.",
    );
    await user.type(screen.getByLabelText("Длительность"), "35");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(screen.getByText("Новый тип события добавлен в локальный список.")).toBeInTheDocument();

    const eventTypesList = screen.getByRole("list", { name: "Список типов событий" });
    const createdEventType = within(eventTypesList).getByRole("button", { name: /Новая диагностика/i });

    expect(createdEventType).toBeInTheDocument();
    expect(within(createdEventType).getByText("35 мин")).toBeInTheDocument();
    expect(within(createdEventType).getByText("Активен")).toBeInTheDocument();
  });

  it("deletes an unused owner event type after confirmation", async () => {
    const user = userEvent.setup();

    render(<App scenario="public" />);

    await user.click(screen.getByRole("button", { name: "Типы событий" }));
    await user.click(screen.getByRole("button", { name: /Короткий созвон/i }));
    await user.click(screen.getByRole("button", { name: "Удалить" }));

    const dialog = screen.getByRole("dialog", { name: "Удалить тип события?" });

    expect(within(dialog).getByText("Он исчезнет из owner workspace и будущих вариантов записи.")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Подтвердить удаление" }));

    expect(screen.getByText("Тип события удален из локального списка.")).toBeInTheDocument();
    expect(
      within(screen.getByRole("list", { name: "Список типов событий" })).queryByRole("button", {
        name: /Короткий созвон/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("shows archive-only controls for a used type and archives it after confirmation", async () => {
    const user = userEvent.setup();

    render(<App scenario="public" />);

    await user.click(screen.getByRole("button", { name: "Типы событий" }));

    const selectedEventType = within(
      screen.getByRole("list", { name: "Список типов событий" }),
    ).getByRole("button", { name: /Стратегическая сессия/i });

    expect(
      screen.getByText("Тип уже использовался в бронированиях. Его можно только архивировать."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Удалить" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Архивировать" })).toBeInTheDocument();
    expect(within(selectedEventType).getByText("Использовался в бронированиях")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Архивировать" }));

    const dialog = screen.getByRole("dialog", { name: "Перевести тип в архив?" });

    expect(
      within(dialog).getByText(
        "Он останется видимым в owner списке для истории бронирований.",
      ),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Подтвердить архивирование" }));

    expect(
      screen.getByText("Тип события переведен в архив в локальном mock-состоянии."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Этот тип находится в архиве. Форма остается доступной для просмотра и локального редактирования."),
    ).toBeInTheDocument();

    expect(within(selectedEventType).getByText("Архив")).toBeInTheDocument();
    expect(within(selectedEventType).getByText("Использовался в бронированиях")).toBeInTheDocument();
  });
});
