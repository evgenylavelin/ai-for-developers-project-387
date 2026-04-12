import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import App from "./App";
import { GuestBookingPage } from "./components/GuestBookingPage";
import { multiEventTypes, singleEventType, slotDates } from "./data/mockGuestFlow";

describe("App", () => {
  it("renders the unavailable state when there are no event types", () => {
    render(<App scenario="none" />);

    expect(
      screen.getByRole("heading", { name: "Запись пока недоступна" }),
    ).toBeInTheDocument();
  });

  it("requires event type selection before continuing", async () => {
    const user = userEvent.setup();

    render(<App scenario="multi" />);

    const nextButton = screen.getByRole("button", { name: "Далее" });

    expect(nextButton).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "30 минут" }));

    expect(nextButton).toBeEnabled();
  });

  it("shows the selected event type above the date and time step", async () => {
    const user = userEvent.setup();

    render(<App scenario="multi" />);

    await user.click(screen.getByRole("button", { name: "30 минут" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));

    expect(screen.getByText("30 минут")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Выберите дату и время" }),
    ).toBeInTheDocument();
  });

  it("shows compact weekdays in the calendar and a full date above slots", () => {
    render(<App scenario="single" />);

    expect(screen.getByText("Ср")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("Среда, 15 апреля")).toBeInTheDocument();
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

  it("shows the selected full date and time in the summary on the date and time step", async () => {
    const user = userEvent.setup();

    render(<App scenario="single" />);

    await user.click(screen.getByRole("button", { name: "09:00" }));

    expect(screen.getByText("30 минут • Среда, 15 апреля • 09:00")).toBeInTheDocument();
  });

  it("shows empty-state copy when the selected date has no available slots", async () => {
    const user = userEvent.setup();

    render(<App scenario="single" />);

    await user.click(screen.getByRole("button", { name: "Чт 16" }));

    expect(
      screen.getByText("На выбранный день свободных слотов нет. Выберите другую дату."),
    ).toBeInTheDocument();
  });

  it("clears the selected time when changing the date", async () => {
    const user = userEvent.setup();

    render(<App scenario="single" />);

    await user.click(screen.getByRole("button", { name: "09:00" }));

    expect(screen.getByText("30 минут • Среда, 15 апреля • 09:00")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Чт 16" }));

    expect(screen.queryByText("30 минут • Среда, 15 апреля • 09:00")).not.toBeInTheDocument();
    expect(
      screen.getByText("На выбранный день свободных слотов нет. Выберите другую дату."),
    ).toBeInTheDocument();
  });

  it("reconciles selected date and time when GuestBookingPage receives new dates", async () => {
    const user = userEvent.setup();

    const initialDates = [
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
    ];
    const nextDates = [
      {
        isoDate: "2026-04-18",
        weekdayShort: "Сб",
        dayNumber: "18",
        fullLabel: "Суббота, 18 апреля",
        slots: ["14:00"],
      },
    ];

    const { rerender } = render(
      <GuestBookingPage eventTypes={singleEventType} dates={initialDates} />,
    );

    await user.click(screen.getByRole("button", { name: "09:00" }));

    expect(screen.getByText("30 минут • Среда, 15 апреля • 09:00")).toBeInTheDocument();

    rerender(<GuestBookingPage eventTypes={singleEventType} dates={nextDates} />);

    expect(screen.getByText("Суббота, 18 апреля")).toBeInTheDocument();
    expect(screen.queryByText("30 минут • Среда, 15 апреля • 09:00")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Далее" })).toBeDisabled();
  });

  it("clears date and time selection after changing the event type", async () => {
    const user = userEvent.setup();

    render(<GuestBookingPage eventTypes={multiEventTypes} dates={slotDates} />);

    await user.click(screen.getByRole("button", { name: "30 минут" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));
    await user.click(screen.getByRole("button", { name: "09:00" }));

    expect(screen.getByText("30 минут • Среда, 15 апреля • 09:00")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Назад" }));
    await user.click(screen.getByRole("button", { name: "15 минут" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));

    expect(screen.getByText("15 минут")).toBeInTheDocument();
    expect(screen.queryByText("15 минут • Среда, 15 апреля • 09:00")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Далее" })).toBeDisabled();
  });

  it("shows explicit empty step state when GuestBookingPage receives no dates", () => {
    render(<GuestBookingPage eventTypes={singleEventType} dates={[]} />);

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

    expect(screen.getByText("30 минут • Среда, 15 апреля • 10:30")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Подтвердить" })).toBeInTheDocument();
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
    expect(screen.getByText("30 минут • Среда, 15 апреля • 10:30")).toBeInTheDocument();
  });
});
