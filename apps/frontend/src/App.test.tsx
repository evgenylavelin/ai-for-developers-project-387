import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import { GuestBookingPage } from "./components/GuestBookingPage";
import { bookingSchedule, multiEventTypes, singleEventType } from "./data/mockGuestFlow";
import { buildPublicCalendarDays } from "./lib/publicCalendar";
import { buildAvailableDatesFromSchedule } from "./lib/publicBookings";
import { resetScheduleCache } from "./lib/scheduleApi";
import type { OwnerEventType } from "./types";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  resetScheduleCache();
});

function createJsonResponse(payload: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(payload), {
    status: init?.status ?? 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function createApiErrorResponse(message: string, status = 409): Response {
  return createJsonResponse({ message }, { status });
}

function createApiBookingDay() {
  const day = buildPublicCalendarDays()[3];

  return {
    ...day,
    shortLabel: `${day.weekdayShort} ${day.dayNumber}`,
  };
}

function createOwnerEventTypesFetchMock(initialOwnerEventTypes?: OwnerEventType[]) {
  const bookingDay = createApiBookingDay();
  let ownerEventTypes: OwnerEventType[] = initialOwnerEventTypes ?? [
    {
      id: "strategy",
      title: "Стратегическая сессия",
      description: "Разбор текущей ситуации, целей на квартал и следующих шагов.",
      durationMinutes: 60,
      isArchived: false,
      hasBookings: true,
    },
    {
      id: "sync",
      title: "Короткий созвон",
      description: "Быстро сверяем контекст, блокеры и решения по текущей задаче.",
      durationMinutes: 20,
      isArchived: false,
      hasBookings: false,
    },
    {
      id: "retrospective",
      title: "Ретроспектива проекта",
      description: "Формат для разбора завершенного этапа и фиксации выводов.",
      durationMinutes: 45,
      isArchived: true,
      hasBookings: true,
    },
  ];

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.endsWith("/bookings")) {
      return createJsonResponse([
        {
          id: "booking-1",
          eventTypeId: "strategy",
          startAt: `${bookingDay.isoDate}T09:00:00Z`,
          endAt: `${bookingDay.isoDate}T10:00:00Z`,
          guestName: "Иван Петров",
          guestEmail: "ivan@example.com",
          status: "active",
        },
      ]);
    }

    if (/\/event-types\/[^/]+\/availability$/.test(url)) {
      return createJsonResponse([
        {
          startAt: `${bookingDay.isoDate}T10:30:00Z`,
          endAt: `${bookingDay.isoDate}T11:00:00Z`,
        },
      ]);
    }

    if (url.endsWith("/owner/event-types") && method === "GET") {
      return createJsonResponse(ownerEventTypes);
    }

    if (url.endsWith("/owner/event-types") && method === "POST") {
      const payload = JSON.parse(String(init?.body ?? "{}")) as {
        title: string;
        description?: string;
        durationMinutes: number;
      };
      const createdEventType = {
        id: `created-${ownerEventTypes.length + 1}`,
        title: payload.title,
        description: payload.description,
        durationMinutes: payload.durationMinutes,
        isArchived: false,
        hasBookings: false,
      };

      ownerEventTypes = [createdEventType, ...ownerEventTypes];

      return createJsonResponse(
        {
          id: createdEventType.id,
          title: createdEventType.title,
          description: createdEventType.description,
          durationMinutes: createdEventType.durationMinutes,
        },
        { status: 201 },
      );
    }

    if (/\/owner\/event-types\/[^:]+:archive$/.test(url) && method === "POST") {
      const eventTypeId = url.split("/owner/event-types/")[1].replace(":archive", "");
      const archivedEventType = ownerEventTypes.find((eventType) => eventType.id === eventTypeId);

      if (!archivedEventType) {
        return createApiErrorResponse("Event type not found.", 404);
      }

      ownerEventTypes = ownerEventTypes.map((eventType) =>
        eventType.id === eventTypeId ? { ...eventType, isArchived: true } : eventType,
      );

      return createJsonResponse(ownerEventTypes.find((eventType) => eventType.id === eventTypeId));
    }

    if (/\/owner\/event-types\/[^/]+$/.test(url) && method === "PATCH") {
      const eventTypeId = url.split("/owner/event-types/")[1];
      const payload = JSON.parse(String(init?.body ?? "{}")) as {
        title: string;
        description?: string;
        durationMinutes: number;
      };

      ownerEventTypes = ownerEventTypes.map((eventType) =>
        eventType.id === eventTypeId ? { ...eventType, ...payload } : eventType,
      );

      return createJsonResponse(ownerEventTypes.find((eventType) => eventType.id === eventTypeId));
    }

    if (/\/owner\/event-types\/[^/]+$/.test(url) && method === "DELETE") {
      const eventTypeId = url.split("/owner/event-types/")[1];
      ownerEventTypes = ownerEventTypes.filter((eventType) => eventType.id !== eventTypeId);

      return new Response(null, { status: 204 });
    }

    if (url.endsWith("/event-types")) {
      return createJsonResponse(
        ownerEventTypes
          .filter((eventType) => !eventType.isArchived)
          .map(({ hasBookings: _hasBookings, isArchived: _isArchived, ...eventType }) => eventType),
      );
    }

    throw new Error(`Unexpected request: ${url}`);
  });

  return {
    fetchMock,
  };
}

async function openOwnerEventTypesWorkspace(user: ReturnType<typeof userEvent.setup>) {
  const currentHeading = await screen.findByRole("heading", {
    name: /^(Бронирования|Типы событий)$/,
  });

  if (currentHeading.textContent === "Типы событий") {
    return;
  }

  await user.click(
    within(screen.getByRole("navigation", { name: "Разделы приложения" })).getByRole("button", {
      name: "Типы событий",
    }),
  );

  expect(await screen.findByRole("heading", { name: "Типы событий" })).toBeInTheDocument();
}

describe("App", () => {
  it("opens owner event types on first run and shows onboarding on bookings when there are no event types", async () => {
    const user = userEvent.setup();

    render(<App scenario="none" />);

    expect(screen.getByRole("heading", { name: "Типы событий" })).toBeInTheDocument();

    await user.click(
      within(screen.getByRole("navigation", { name: "Разделы рабочего пространства" })).getByRole("button", {
        name: "Бронирования",
      }),
    );

    expect(await screen.findByRole("heading", { name: "Бронирования" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Добавьте тип события, чтобы открыть запись" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Перейти к типам событий" })).toBeInTheDocument();
  });

  it("opens the public bookings home when bookings already exist", () => {
    render(<App scenario="public" />);

    expect(screen.getByRole("heading", { name: "Бронирования" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Записаться" })).toBeInTheDocument();
    expect(screen.getByText("Иван Петров")).toBeInTheDocument();
  });

  it("loads public bookings and event types from the API on startup", async () => {
    const bookingDay = createApiBookingDay();

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/owner/event-types")) {
        return Promise.resolve(createJsonResponse([]));
      }

      if (url.endsWith("/event-types")) {
        return Promise.resolve(
          createJsonResponse([
            {
              id: "standard",
              title: "Стратегическая сессия",
              durationMinutes: 30,
            },
          ]),
        );
      }

      if (url.endsWith("/bookings")) {
        return Promise.resolve(
          createJsonResponse([
            {
              id: "booking-1",
              eventTypeId: "standard",
              startAt: `${bookingDay.isoDate}T09:00:00Z`,
              endAt: `${bookingDay.isoDate}T09:30:00Z`,
              guestName: "Иван Петров",
              guestEmail: "ivan@example.com",
              status: "active",
            },
          ]),
        );
      }

      if (url.endsWith("/event-types/standard/availability")) {
        return Promise.resolve(
          createJsonResponse([
            {
              startAt: `${bookingDay.isoDate}T10:30:00Z`,
              endAt: `${bookingDay.isoDate}T11:00:00Z`,
            },
          ]),
        );
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Бронирования" })).toBeInTheDocument();
    expect(await screen.findByText("Иван Петров")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/event-types");
    expect(fetchMock).toHaveBeenCalledWith("/owner/event-types");
    expect(fetchMock).toHaveBeenCalledWith("/bookings");
    expect(fetchMock).toHaveBeenCalledWith("/event-types/standard/availability");
  });

  it("opens owner event types after remote startup when there are no public event types", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/owner/event-types")) {
        return Promise.resolve(createJsonResponse([]));
      }

      if (url.endsWith("/event-types")) {
        return Promise.resolve(createJsonResponse([]));
      }

      if (url.endsWith("/bookings")) {
        return Promise.resolve(createJsonResponse([]));
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Типы событий" })).toBeInTheDocument();

    await user.click(
      within(screen.getByRole("navigation", { name: "Разделы рабочего пространства" })).getByRole("button", {
        name: "Бронирования",
      }),
    );

    expect(await screen.findByRole("heading", { name: "Бронирования" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Добавьте тип события, чтобы открыть запись" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Перейти к типам событий" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/event-types");
    expect(fetchMock).toHaveBeenCalledWith("/owner/event-types");
    expect(fetchMock).toHaveBeenCalledWith("/bookings");
  });

  it("keeps public startup available when owner event types fail to load", async () => {
    const bookingDay = createApiBookingDay();

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/owner/event-types")) {
        return Promise.resolve(
          createJsonResponse(
            { message: "Не удалось загрузить типы событий владельца." },
            { status: 503 },
          ),
        );
      }

      if (url.endsWith("/event-types")) {
        return Promise.resolve(
          createJsonResponse([
            {
              id: "standard",
              title: "Стратегическая сессия",
              durationMinutes: 30,
            },
          ]),
        );
      }

      if (url.endsWith("/bookings")) {
        return Promise.resolve(
          createJsonResponse([
            {
              id: "booking-1",
              eventTypeId: "standard",
              startAt: `${bookingDay.isoDate}T09:00:00Z`,
              endAt: `${bookingDay.isoDate}T09:30:00Z`,
              guestName: "Иван Петров",
              guestEmail: "ivan@example.com",
              status: "active",
            },
          ]),
        );
      }

      if (url.endsWith("/event-types/standard/availability")) {
        return Promise.resolve(
          createJsonResponse([
            {
              startAt: `${bookingDay.isoDate}T10:30:00Z`,
              endAt: `${bookingDay.isoDate}T11:00:00Z`,
            },
          ]),
        );
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Бронирования" })).toBeInTheDocument();
    expect(await screen.findByText("Иван Петров")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Не удалось загрузить данные" }),
    ).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/owner/event-types");
  });

  it("renders the public home with an inline warning when bookings fail to load", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/owner/event-types")) {
        return Promise.resolve(createJsonResponse([]));
      }

      if (url.endsWith("/event-types")) {
        return Promise.resolve(
          createJsonResponse([
            {
              id: "standard",
              title: "Стратегическая сессия",
              durationMinutes: 30,
            },
          ]),
        );
      }

      if (url.endsWith("/bookings")) {
        return Promise.reject(new Error("network down"));
      }

      if (url.endsWith("/event-types/standard/availability")) {
        return Promise.resolve(createJsonResponse([]));
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Бронирования" })).toBeInTheDocument();
    expect(await screen.findByText("Часть данных не удалось загрузить.")).toBeInTheDocument();
    expect(screen.getByText("Не удалось загрузить публичные бронирования для выбранной даты.")).toBeInTheDocument();
    expect(screen.queryByText("На выбранную дату публичных бронирований пока нет.")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Не удалось загрузить данные" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the public home open and disables booking when event types fail to load", async () => {
    const bookingDay = createApiBookingDay();

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/owner/event-types")) {
        return Promise.resolve(createJsonResponse([]));
      }

      if (url.endsWith("/event-types")) {
        return Promise.reject(new Error("network down"));
      }

      if (url.endsWith("/bookings")) {
        return Promise.resolve(
          createJsonResponse([
            {
              id: "booking-1",
              eventTypeId: "standard",
              startAt: `${bookingDay.isoDate}T09:00:00Z`,
              endAt: `${bookingDay.isoDate}T09:30:00Z`,
              guestName: "Иван Петров",
              guestEmail: "ivan@example.com",
              status: "active",
            },
          ]),
        );
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Бронирования" })).toBeInTheDocument();
    expect(await screen.findByText("Иван Петров")).toBeInTheDocument();
    expect(await screen.findByText("Часть данных не удалось загрузить.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Записаться" })).toBeDisabled();
    expect(
      screen.getByText("Запись временно недоступна: не удалось загрузить типы событий."),
    ).toBeInTheDocument();
  });

  it("keeps the public home open and disables booking when availability fails to load", async () => {
    const bookingDay = createApiBookingDay();

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/owner/event-types")) {
        return Promise.resolve(createJsonResponse([]));
      }

      if (url.endsWith("/event-types")) {
        return Promise.resolve(
          createJsonResponse([
            {
              id: "standard",
              title: "Стратегическая сессия",
              durationMinutes: 30,
            },
          ]),
        );
      }

      if (url.endsWith("/bookings")) {
        return Promise.resolve(
          createJsonResponse([
            {
              id: "booking-1",
              eventTypeId: "standard",
              startAt: `${bookingDay.isoDate}T09:00:00Z`,
              endAt: `${bookingDay.isoDate}T09:30:00Z`,
              guestName: "Иван Петров",
              guestEmail: "ivan@example.com",
              status: "active",
            },
          ]),
        );
      }

      if (url.endsWith("/event-types/standard/availability")) {
        return Promise.reject(new Error("network down"));
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Бронирования" })).toBeInTheDocument();
    expect(await screen.findByText("Часть данных не удалось загрузить.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Записаться" })).toBeDisabled();
    expect(
      screen.getByText("Запись временно недоступна: не удалось загрузить доступные слоты."),
    ).toBeInTheDocument();
  });

  it("retries startup loading from the inline warning and clears it after success", async () => {
    const bookingDay = createApiBookingDay();
    let shouldFailBookings = true;

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/owner/event-types")) {
        return Promise.resolve(createJsonResponse([]));
      }

      if (url.endsWith("/event-types")) {
        return Promise.resolve(
          createJsonResponse([
            {
              id: "standard",
              title: "Стратегическая сессия",
              durationMinutes: 30,
            },
          ]),
        );
      }

      if (url.endsWith("/bookings")) {
        if (shouldFailBookings) {
          return Promise.reject(new Error("network down"));
        }

        return Promise.resolve(
          createJsonResponse([
            {
              id: "booking-1",
              eventTypeId: "standard",
              startAt: `${bookingDay.isoDate}T09:00:00Z`,
              endAt: `${bookingDay.isoDate}T09:30:00Z`,
              guestName: "Иван Петров",
              guestEmail: "ivan@example.com",
              status: "active",
            },
          ]),
        );
      }

      if (url.endsWith("/event-types/standard/availability")) {
        return Promise.resolve(createJsonResponse([]));
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();

    render(<App />);

    expect(await screen.findByText("Часть данных не удалось загрузить.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Записаться" })).toBeEnabled();

    shouldFailBookings = false;
    await user.click(screen.getByRole("button", { name: "Повторить загрузку" }));

    expect(
      await within(screen.getByRole("button", { name: bookingDay.fullLabel })).findByText("1 занято"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Записаться" })).toBeEnabled();
    expect(screen.queryByText("Часть данных не удалось загрузить.")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Не удалось загрузить публичные бронирования для выбранной даты."),
    ).not.toBeInTheDocument();
  });

  it("re-enables booking after retry when event types fail during startup", async () => {
    const bookingDay = createApiBookingDay();
    let shouldFailEventTypes = true;

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/owner/event-types")) {
        return Promise.resolve(createJsonResponse([]));
      }

      if (url.endsWith("/event-types")) {
        if (shouldFailEventTypes) {
          return Promise.reject(new Error("network down"));
        }

        return Promise.resolve(
          createJsonResponse([
            {
              id: "standard",
              title: "Стратегическая сессия",
              durationMinutes: 30,
            },
          ]),
        );
      }

      if (url.endsWith("/bookings")) {
        return Promise.resolve(
          createJsonResponse([
            {
              id: "booking-1",
              eventTypeId: "standard",
              startAt: `${bookingDay.isoDate}T09:00:00Z`,
              endAt: `${bookingDay.isoDate}T09:30:00Z`,
              guestName: "Иван Петров",
              guestEmail: "ivan@example.com",
              status: "active",
            },
          ]),
        );
      }

      if (url.endsWith("/event-types/standard/availability")) {
        return Promise.resolve(createJsonResponse([]));
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();

    render(<App />);

    expect(await screen.findByText("Часть данных не удалось загрузить.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Записаться" })).toBeDisabled();
    expect(
      screen.getByText("Запись временно недоступна: не удалось загрузить типы событий."),
    ).toBeInTheDocument();

    shouldFailEventTypes = false;
    await user.click(screen.getByRole("button", { name: "Повторить загрузку" }));

    expect(await screen.findByRole("button", { name: /Стратегическая сессия, 30 мин/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Записаться" })).toBeEnabled();
    expect(screen.queryByText("Часть данных не удалось загрузить.")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Запись временно недоступна: не удалось загрузить типы событий."),
    ).not.toBeInTheDocument();
  });

  it("clears a combined startup warning after retry when bookings and event types both recover", async () => {
    const bookingDay = createApiBookingDay();
    let shouldFailStartup = true;

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/owner/event-types")) {
        return Promise.resolve(createJsonResponse([]));
      }

      if (url.endsWith("/event-types")) {
        if (shouldFailStartup) {
          return Promise.reject(new Error("event types down"));
        }

        return Promise.resolve(
          createJsonResponse([
            {
              id: "standard",
              title: "Стратегическая сессия",
              durationMinutes: 30,
            },
          ]),
        );
      }

      if (url.endsWith("/bookings")) {
        if (shouldFailStartup) {
          return Promise.reject(new Error("bookings down"));
        }

        return Promise.resolve(
          createJsonResponse([
            {
              id: "booking-1",
              eventTypeId: "standard",
              startAt: `${bookingDay.isoDate}T09:00:00Z`,
              endAt: `${bookingDay.isoDate}T09:30:00Z`,
              guestName: "Иван Петров",
              guestEmail: "ivan@example.com",
              status: "active",
            },
          ]),
        );
      }

      if (url.endsWith("/event-types/standard/availability")) {
        return Promise.resolve(createJsonResponse([]));
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();

    render(<App />);

    expect(await screen.findByText("Часть данных не удалось загрузить.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Записаться" })).toBeDisabled();
    expect(
      screen.getByText("Проблемы с загрузкой: бронирования, типы событий."),
    ).toBeInTheDocument();

    shouldFailStartup = false;
    await user.click(screen.getByRole("button", { name: "Повторить загрузку" }));

    expect(
      await within(screen.getByRole("button", { name: bookingDay.fullLabel })).findByText("1 занято"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Записаться" })).toBeEnabled();
    expect(screen.queryByText("Часть данных не удалось загрузить.")).not.toBeInTheDocument();
    expect(screen.queryByText("Проблемы с загрузкой: бронирования, типы событий.")).not.toBeInTheDocument();
  });

  it("refreshes bookings and availability after a successful API booking", async () => {
    const bookingDay = createApiBookingDay();

    const bookingsState = [
      {
        id: "booking-1",
        eventTypeId: "standard",
        startAt: `${bookingDay.isoDate}T09:00:00Z`,
        endAt: `${bookingDay.isoDate}T09:30:00Z`,
        guestName: "Иван Петров",
        guestEmail: "ivan@example.com",
        status: "active",
      },
    ];
    let availabilityState = [
      {
        startAt: `${bookingDay.isoDate}T10:30:00Z`,
        endAt: `${bookingDay.isoDate}T11:00:00Z`,
      },
    ];

    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith("/owner/event-types")) {
        return Promise.resolve(createJsonResponse([]));
      }

      if (url.endsWith("/event-types")) {
        return Promise.resolve(
          createJsonResponse([
            {
              id: "standard",
              title: "Стратегическая сессия",
              durationMinutes: 30,
            },
          ]),
        );
      }

      if (url.endsWith("/bookings") && init?.method === "POST") {
        bookingsState.push({
          id: "booking-2",
          eventTypeId: "standard",
          startAt: `${bookingDay.isoDate}T10:30:00Z`,
          endAt: `${bookingDay.isoDate}T11:00:00Z`,
          guestName: "Мария",
          guestEmail: "maria@example.com",
          status: "active",
        });
        availabilityState = [];

        return Promise.resolve(createJsonResponse(bookingsState[1]));
      }

      if (url.endsWith("/bookings")) {
        return Promise.resolve(createJsonResponse(bookingsState));
      }

      if (url.endsWith("/event-types/standard/availability")) {
        return Promise.resolve(createJsonResponse(availabilityState));
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Бронирования" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Записаться" }));
    await user.click(screen.getByRole("button", { name: bookingDay.shortLabel }));
    await user.click(screen.getByRole("button", { name: "10:30" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));
    await user.type(screen.getByRole("textbox", { name: "Имя" }), "Мария");
    await user.type(screen.getByRole("textbox", { name: "Email" }), "maria@example.com");
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));

    expect(
      await screen.findByRole("heading", { name: "Бронирование подтверждено" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Вернуться к бронированиям" }));

    expect(await screen.findByRole("heading", { name: "Бронирования" })).toBeInTheDocument();
    expect(await screen.findByText("Мария")).toBeInTheDocument();
    expect(
      within(screen.getByRole("button", { name: bookingDay.fullLabel })).getByText("2 занято"),
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.filter(([url, init]) => String(url).endsWith("/bookings") && !init)
        .length,
    ).toBe(2);
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith("/event-types/standard/availability"),
      ).length,
    ).toBe(2);
  });

  it("shows an inline submit error when the API booking request fails", async () => {
    const bookingDay = createApiBookingDay();

    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith("/owner/event-types")) {
        return Promise.resolve(createJsonResponse([]));
      }

      if (url.endsWith("/event-types")) {
        return Promise.resolve(
          createJsonResponse([
            {
              id: "standard",
              title: "Стратегическая сессия",
              durationMinutes: 30,
            },
          ]),
        );
      }

      if (url.endsWith("/bookings") && init?.method === "POST") {
        return Promise.resolve(createApiErrorResponse("Слот уже занят."));
      }

      if (url.endsWith("/bookings")) {
        return Promise.resolve(createJsonResponse([]));
      }

      if (url.endsWith("/event-types/standard/availability")) {
        return Promise.resolve(
          createJsonResponse([
            {
              startAt: `${bookingDay.isoDate}T10:30:00Z`,
              endAt: `${bookingDay.isoDate}T11:00:00Z`,
            },
          ]),
        );
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Бронирования" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Записаться" }));

    expect(
      await screen.findByRole("heading", { name: "Выберите дату и время" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: bookingDay.shortLabel }));
    await user.click(screen.getByRole("button", { name: "10:30" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));
    await user.type(screen.getByRole("textbox", { name: "Имя" }), "Иван");
    await user.type(screen.getByRole("textbox", { name: "Email" }), "ivan@example.com");
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));

    expect(await screen.findByText("Слот уже занят.")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Введите контактные данные" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Бронирование подтверждено" }),
    ).not.toBeInTheDocument();
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
    const datesByEventType = buildAvailableDatesFromSchedule(bookingSchedule, multiEventTypes, []);

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
    await user.type(screen.getByRole("textbox", { name: "Имя" }), "Иван");
    await user.type(screen.getByRole("textbox", { name: "Email" }), "ivan@example.com");
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
    await user.type(screen.getByRole("textbox", { name: "Имя" }), "Мария");
    await user.type(screen.getByRole("textbox", { name: "Email" }), "maria@example.com");
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
    await user.type(screen.getByRole("textbox", { name: "Имя" }), "Иван");
    await user.type(screen.getByRole("textbox", { name: "Email" }), "ivan@example.com");
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));
    await user.click(screen.getByRole("button", { name: "Вернуться в начало" }));

    expect(screen.getByRole("heading", { name: "Выберите тип встречи" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Далее" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Стратегическая сессия" })).not.toHaveClass(
      "choice-card--selected",
    );
  });

  it("navigates to owner settings through the embedded owner navigation and back", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        workingDays: ["monday", "wednesday"],
        startTime: "09:00",
        endTime: "18:00",
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<App scenario="public" />);

    expect(screen.getByRole("heading", { name: "Бронирования" })).toBeInTheDocument();

    await user.click(
      within(screen.getByRole("navigation", { name: "Разделы приложения" })).getByRole("button", {
        name: "Типы событий",
      }),
    );

    const workspaceNav = screen.getByRole("navigation", { name: "Разделы рабочего пространства" });

    await user.click(within(workspaceNav).getByRole("button", { name: "Настройки" }));

    expect(await screen.findByRole("heading", { name: "Настройки" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("09:00")).toBeInTheDocument();
    expect(screen.getByDisplayValue("18:00")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const settingsNav = screen.getByRole("navigation", { name: "Разделы рабочего пространства" });

    await user.click(within(settingsNav).getByRole("button", { name: "Бронирования" }));

    expect(await screen.findByRole("heading", { name: "Бронирования" })).toBeInTheDocument();
  });

  it("opens owner settings directly from the public bookings navigation", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        workingDays: ["monday", "wednesday"],
        startTime: "09:00",
        endTime: "18:00",
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<App scenario="public" />);

    await user.click(
      within(screen.getByRole("navigation", { name: "Разделы приложения" })).getByRole("button", {
        name: "Настройки",
      }),
    );

    expect(await screen.findByRole("heading", { name: "Настройки" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('opens create mode from "+ Создать тип события" with a single create path', async () => {
    const user = userEvent.setup();
    const { fetchMock } = createOwnerEventTypesFetchMock();

    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await openOwnerEventTypesWorkspace(user);
    expect(await screen.findByRole("button", { name: /Короткий созвон/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "+ Создать тип события" }));

    expect(screen.getByRole("heading", { name: "Новый тип события" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+ Создать тип события" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Добавить" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Сохранить" })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Название" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "Описание" })).toHaveValue("");
    expect(screen.getByRole("spinbutton", { name: "Длительность" })).toHaveValue(null);
    expect(screen.queryByRole("button", { name: "Удалить" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Архивировать" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Подтвердить удаление|Подтвердить архивирование/)).not.toBeInTheDocument();
  });

  it("shows a passive empty state when no event types exist", async () => {
    const user = userEvent.setup();
    const { fetchMock } = createOwnerEventTypesFetchMock([]);

    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await openOwnerEventTypesWorkspace(user);

    expect(screen.getByText("Типов событий пока нет.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Создать первый тип" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Новый тип события" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Добавить" })).toBeInTheDocument();
  });

  it("creates an owner event type through the backend and refreshes public choices", async () => {
    const user = userEvent.setup();
    const { fetchMock } = createOwnerEventTypesFetchMock();

    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await openOwnerEventTypesWorkspace(user);
    expect(await screen.findByRole("button", { name: /Короткий созвон/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "+ Создать тип события" }));
    await user.type(screen.getByRole("textbox", { name: "Название" }), "Новая диагностика");
    await user.type(
      screen.getByRole("textbox", { name: "Описание" }),
      "Проверка текущего состояния и следующих шагов.",
    );
    await user.type(screen.getByRole("spinbutton", { name: "Длительность" }), "35");
    await user.click(screen.getByRole("button", { name: "Добавить" }));

    expect(await screen.findByText("Тип события создан.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Сохранить" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Создать тип события" })).toBeInTheDocument();

    const eventTypesList = screen.getByRole("list", { name: "Список типов событий" });
    const createdEventType = within(eventTypesList).getByRole("button", { name: /Новая диагностика/i });

    expect(createdEventType).toBeInTheDocument();
    expect(within(createdEventType).getByText("35 мин")).toBeInTheDocument();
    expect(within(createdEventType).getByText("Активен")).toBeInTheDocument();

    await user.click(
      within(screen.getByRole("navigation", { name: "Разделы рабочего пространства" })).getByRole("button", {
        name: "Бронирования",
      }),
    );

    expect(await screen.findByRole("button", { name: /Новая диагностика/i })).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) => String(url).endsWith("/owner/event-types") && init?.method === "POST",
      ),
    ).toBe(true);
  });

  it("updates an owner event type through the backend and refreshes public choices", async () => {
    const user = userEvent.setup();
    const { fetchMock } = createOwnerEventTypesFetchMock();

    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await openOwnerEventTypesWorkspace(user);
    await user.click(screen.getByRole("button", { name: /Короткий созвон/i }));
    await user.clear(screen.getByRole("textbox", { name: "Название" }));
    await user.type(screen.getByRole("textbox", { name: "Название" }), "Короткий статус");
    await user.clear(screen.getByRole("textbox", { name: "Описание" }));
    await user.type(screen.getByRole("textbox", { name: "Описание" }), "Обновленный формат быстрой синхронизации.");
    await user.clear(screen.getByRole("spinbutton", { name: "Длительность" }));
    await user.type(screen.getByRole("spinbutton", { name: "Длительность" }), "25");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(await screen.findByText("Изменения сохранены.")).toBeInTheDocument();

    const eventTypesList = screen.getByRole("list", { name: "Список типов событий" });
    expect(within(eventTypesList).getByRole("button", { name: /Короткий статус/i })).toBeInTheDocument();

    await user.click(
      within(screen.getByRole("navigation", { name: "Разделы рабочего пространства" })).getByRole("button", {
        name: "Бронирования",
      }),
    );

    expect(await screen.findByRole("button", { name: /Короткий статус/i })).toBeInTheDocument();
  });

  it("deletes an unused owner event type through the backend", async () => {
    const user = userEvent.setup();
    const { fetchMock } = createOwnerEventTypesFetchMock();

    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await openOwnerEventTypesWorkspace(user);
    await user.click(screen.getByRole("button", { name: /Короткий созвон/i }));
    await user.click(screen.getByRole("button", { name: "Удалить" }));

    const dialog = screen.getByRole("dialog", { name: "Удалить тип события?" });

    expect(within(dialog).getByText("Он исчезнет из owner workspace и будущих вариантов записи.")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Подтвердить удаление" }));

    expect(await screen.findByText("Тип события удален.")).toBeInTheDocument();
    expect(
      within(screen.getByRole("list", { name: "Список типов событий" })).queryByRole("button", {
        name: /Короткий созвон/i,
      }),
    ).not.toBeInTheDocument();

    await user.click(
      within(screen.getByRole("navigation", { name: "Разделы рабочего пространства" })).getByRole("button", {
        name: "Бронирования",
      }),
    );

    expect(screen.queryByRole("button", { name: /Короткий созвон/i })).not.toBeInTheDocument();
  });

  it("archives a used owner event type through the backend and removes it from public choices", async () => {
    const user = userEvent.setup();
    const { fetchMock } = createOwnerEventTypesFetchMock();

    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await openOwnerEventTypesWorkspace(user);

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

    expect(await screen.findByText("Тип события переведен в архив.")).toBeInTheDocument();
    expect(
      screen.getByText("Этот тип находится в архиве. Форма остается доступной для просмотра и редактирования."),
    ).toBeInTheDocument();

    expect(within(selectedEventType).getByText("Архив")).toBeInTheDocument();
    expect(within(selectedEventType).getByText("Использовался в бронированиях")).toBeInTheDocument();

    await user.click(
      within(screen.getByRole("navigation", { name: "Разделы рабочего пространства" })).getByRole("button", {
        name: "Бронирования",
      }),
    );

    expect(screen.queryByRole("button", { name: /Стратегическая сессия/i })).not.toBeInTheDocument();
  });
});
