import { useEffect, useState } from "react";

import { GuestBookingPage } from "./components/GuestBookingPage";
import { OwnerEventTypesPage } from "./components/OwnerEventTypesPage";
import { OwnerSettingsPage } from "./components/OwnerSettingsPage";
import { PublicBookingsHome } from "./components/PublicBookingsHome";
import { cancelBooking, createBooking, getAvailability, listBookings } from "./lib/bookingsApi";
import {
  archiveOwnerEventType,
  createOwnerEventType,
  deleteOwnerEventType,
  getGuestEventTypes,
  getOwnerEventTypes,
  updateOwnerEventType,
} from "./lib/eventTypesApi";
import {
  buildAvailableDatesFromSchedule,
  cancelPublicBooking,
  getInitialSelectedDate,
} from "./lib/publicBookings";
import {
  buildAvailableDatesFromAvailability,
  buildPublicCalendarDays,
} from "./lib/publicCalendar";
import {
  buildCreateBookingRequest,
  buildScenarioAvailability,
  createScenarioBooking,
  getScenarioData,
  getScenarioOwnerEventTypes,
  type AppScenario,
} from "./lib/appScenarios";
import type {
  AvailabilityByEventType,
  Booking,
  BookingDraft,
  EventType,
  OwnerEventType,
  OwnerEventTypeInput,
  ScheduleDay,
  Workspace,
} from "./types";

type AppProps = {
  scenario?: AppScenario;
};

type PublicLoadErrors = {
  bookings: string;
  eventTypes: string;
  availability: string;
};

type PublicLoadStatuses = {
  bookings: "loading" | "ready" | "error";
  eventTypes: "loading" | "ready" | "error";
  availability: "idle" | "loading" | "ready" | "error";
};

const EMPTY_PUBLIC_LOAD_ERRORS: PublicLoadErrors = {
  bookings: "",
  eventTypes: "",
  availability: "",
};

const INITIAL_PUBLIC_LOAD_STATUSES: PublicLoadStatuses = {
  bookings: "loading",
  eventTypes: "loading",
  availability: "loading",
};

function toOwnerEventType(eventType: EventType): OwnerEventType {
  return {
    ...eventType,
    isArchived: false,
    hasBookings: false,
  };
}

function toGuestEventType(eventType: OwnerEventType): EventType {
  return {
    id: eventType.id,
    title: eventType.title,
    description: eventType.description,
    durationMinutes: eventType.durationMinutes,
  };
}

function upsertById<T extends { id: string }>(items: T[], nextItem: T): T[] {
  return [nextItem, ...items.filter((item) => item.id !== nextItem.id)];
}

function removeById<T extends { id: string }>(items: T[], itemId: string): T[] {
  return items.filter((item) => item.id !== itemId);
}

function removeAvailabilityEntry(
  availabilityByEventType: AvailabilityByEventType,
  eventTypeId: string,
): AvailabilityByEventType {
  const nextAvailability = { ...availabilityByEventType };

  delete nextAvailability[eventTypeId];

  return nextAvailability;
}

export default function App({ scenario }: AppProps) {
  const isScenarioMode = scenario !== undefined;
  const scenarioData = isScenarioMode ? getScenarioData(scenario) : null;
  const [workspace, setWorkspace] = useState<Workspace>("public");
  const [guestEventTypes, setGuestEventTypes] = useState<EventType[]>(scenarioData?.eventTypes ?? []);
  const [ownerEventTypes, setOwnerEventTypes] = useState<OwnerEventType[]>(
    scenarioData ? getScenarioOwnerEventTypes() : [],
  );
  const [bookings, setBookings] = useState<Booking[]>(scenarioData?.bookings ?? []);
  const [availabilityByEventType, setAvailabilityByEventType] = useState<AvailabilityByEventType>(
    scenarioData ? buildScenarioAvailability(scenarioData.schedule, scenarioData.eventTypes) : {},
  );
  const [loading, setLoading] = useState(!scenarioData);
  const [publicLoadErrors, setPublicLoadErrors] = useState<PublicLoadErrors>(EMPTY_PUBLIC_LOAD_ERRORS);
  const [publicLoadStatuses, setPublicLoadStatuses] = useState<PublicLoadStatuses>(
    scenarioData
      ? {
          bookings: "ready",
          eventTypes: "ready",
          availability: "ready",
        }
      : INITIAL_PUBLIC_LOAD_STATUSES,
  );
  const [ownerEventTypesError, setOwnerEventTypesError] = useState("");
  const [actionError, setActionError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [screen, setScreen] = useState<"home" | "booking">(
    scenarioData ? (scenarioData.bookings.length ? "home" : "booking") : "home",
  );
  const [successDestination, setSuccessDestination] = useState<"restart" | "home">(
    scenarioData?.bookings.length ? "home" : "restart",
  );
  const [selectedHomeDate, setSelectedHomeDate] = useState(
    scenarioData ? getInitialSelectedDate(scenarioData.schedule, scenarioData.bookings) : "",
  );

  useEffect(() => {
    if (!isScenarioMode) {
      return;
    }

    const nextScenarioData = getScenarioData(scenario);

    setWorkspace("public");
    setGuestEventTypes(nextScenarioData.eventTypes);
    setOwnerEventTypes(getScenarioOwnerEventTypes());
    setBookings(nextScenarioData.bookings);
    setAvailabilityByEventType(
      buildScenarioAvailability(nextScenarioData.schedule, nextScenarioData.eventTypes),
    );
    setLoading(false);
    setPublicLoadErrors(EMPTY_PUBLIC_LOAD_ERRORS);
    setPublicLoadStatuses({
      bookings: "ready",
      eventTypes: "ready",
      availability: "ready",
    });
    setOwnerEventTypesError("");
    setActionError("");
    setScreen(nextScenarioData.bookings.length > 0 ? "home" : "booking");
    setSuccessDestination(nextScenarioData.bookings.length > 0 ? "home" : "restart");
    setSelectedHomeDate(getInitialSelectedDate(nextScenarioData.schedule, nextScenarioData.bookings));
  }, [isScenarioMode, scenario]);

  useEffect(() => {
    if (isScenarioMode) {
      return;
    }

    let alive = true;

    async function loadRemoteState() {
      setLoading(true);
      setPublicLoadStatuses({
        bookings: "loading",
        eventTypes: "loading",
        availability: "loading",
      });
      setActionError("");

      const nextErrors: PublicLoadErrors = {
        bookings: "",
        eventTypes: "",
        availability: "",
      };
      const nextStatuses: PublicLoadStatuses = {
        bookings: "loading",
        eventTypes: "loading",
        availability: "loading",
      };
      let loadedGuestEventTypes: EventType[] = [];
      let loadedBookings: Booking[] = [];
      let loadedAvailability: AvailabilityByEventType = {};

      try {
        const [guestEventTypesResult, bookingsResult] = await Promise.allSettled([
          getGuestEventTypes(),
          listBookings(),
        ]);

        if (guestEventTypesResult.status === "fulfilled") {
          loadedGuestEventTypes = guestEventTypesResult.value;
          nextStatuses.eventTypes = "ready";
        } else {
          nextErrors.eventTypes =
            guestEventTypesResult.reason instanceof Error
              ? guestEventTypesResult.reason.message
              : "Не удалось загрузить типы событий.";
          nextStatuses.eventTypes = "error";
          nextStatuses.availability = "idle";
        }

        if (bookingsResult.status === "fulfilled") {
          loadedBookings = bookingsResult.value;
          nextStatuses.bookings = "ready";
        } else {
          nextErrors.bookings =
            bookingsResult.reason instanceof Error
              ? bookingsResult.reason.message
              : "Не удалось загрузить бронирования.";
          nextStatuses.bookings = "error";
        }

        if (nextStatuses.eventTypes === "ready") {
          try {
            loadedAvailability = Object.fromEntries(
              await Promise.all(
                loadedGuestEventTypes.map(async (eventType) => [
                  eventType.id,
                  await getAvailability(eventType.id),
                ]),
              ),
            ) as AvailabilityByEventType;
            nextStatuses.availability = "ready";
          } catch (error) {
            nextErrors.availability =
              error instanceof Error
                ? error.message
                : "Не удалось загрузить доступные слоты.";
            nextStatuses.availability = "error";
          }
        }

        if (!alive) {
          return;
        }

        const remoteCalendarDays = buildPublicCalendarDays();

        setGuestEventTypes(loadedGuestEventTypes);
        setBookings(loadedBookings);
        setAvailabilityByEventType(loadedAvailability);
        setPublicLoadErrors(nextErrors);
        setPublicLoadStatuses(nextStatuses);
        setOwnerEventTypesError("");
        setScreen("home");
        setSuccessDestination("home");
        setSelectedHomeDate(getInitialSelectedDate(remoteCalendarDays, loadedBookings));

        void getOwnerEventTypes()
          .then((loadedOwnerEventTypes) => {
            if (!alive) {
              return;
            }

            setOwnerEventTypes(loadedOwnerEventTypes);
            setOwnerEventTypesError("");
          })
          .catch((error) => {
            if (!alive) {
              return;
            }

            setOwnerEventTypes([]);
            setOwnerEventTypesError(
              error instanceof Error
                ? error.message
                : "Не удалось загрузить типы событий владельца.",
            );
          });
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    void loadRemoteState();

    return () => {
      alive = false;
    };
  }, [isScenarioMode, reloadToken]);

  const schedule: ScheduleDay[] = scenarioData?.schedule ?? [];
  const calendarDays = isScenarioMode
    ? schedule.map(({ slotsByEventType: _slotsByEventType, ...day }) => day)
    : buildPublicCalendarDays();

  const datesByEventType = isScenarioMode
    ? buildAvailableDatesFromSchedule(schedule, guestEventTypes, bookings)
    : buildAvailableDatesFromAvailability(availabilityByEventType, calendarDays);
  const publicStartupFailures = [
    publicLoadErrors.bookings ? "бронирования" : "",
    publicLoadErrors.eventTypes ? "типы событий" : "",
    publicLoadErrors.availability ? "доступные слоты" : "",
  ].filter(Boolean);
  const publicStartupWarning = publicStartupFailures.length
    ? `Проблемы с загрузкой: ${publicStartupFailures.join(", ")}.`
    : "";
  const bookingEntryDisabledReason = loading
    ? "Запись станет доступна после загрузки типов событий и свободных слотов."
    : publicLoadErrors.eventTypes
      ? "Запись временно недоступна: не удалось загрузить типы событий."
      : publicLoadErrors.availability
        ? "Запись временно недоступна: не удалось загрузить доступные слоты."
        : guestEventTypes.length === 0
          ? "Запись пока недоступна: сейчас нет активных типов событий."
          : "";

  const refreshBookings = async () => {
    const nextBookings = await listBookings();

    setBookings(nextBookings);

    return nextBookings;
  };

  const refreshAvailability = async (eventTypes: EventType[]) => {
    const nextAvailability = Object.fromEntries(
      await Promise.all(eventTypes.map(async (eventType) => [eventType.id, await getAvailability(eventType.id)])),
    ) as AvailabilityByEventType;

    setAvailabilityByEventType(nextAvailability);
  };

  const refreshEventTypeState = async () => {
    const [nextGuestEventTypes, nextOwnerEventTypes] = await Promise.all([
      getGuestEventTypes(),
      getOwnerEventTypes(),
    ]);

    setGuestEventTypes(nextGuestEventTypes);
    setOwnerEventTypes(nextOwnerEventTypes);
    setOwnerEventTypesError("");
    await refreshAvailability(nextGuestEventTypes);

    return nextOwnerEventTypes;
  };

  const retryOwnerEventTypesLoad = async () => {
    const nextOwnerEventTypes = await getOwnerEventTypes();

    setOwnerEventTypes(nextOwnerEventTypes);
    setOwnerEventTypesError("");
  };

  const refreshPublicState = async (eventTypes: EventType[]) => {
    const [nextBookings] = await Promise.all([refreshBookings(), refreshAvailability(eventTypes)]);

    return nextBookings;
  };

  const handleWorkspaceChange = (nextWorkspace: Workspace) => {
    setWorkspace(nextWorkspace);
  };

  const handleCreateOwnerEventType = async (input: OwnerEventTypeInput) => {
    if (isScenarioMode) {
      const createdEventType: OwnerEventType = {
        id: `scenario-${Date.now()}`,
        isArchived: false,
        hasBookings: false,
        ...input,
      };

      setOwnerEventTypes((currentEventTypes) => [createdEventType, ...currentEventTypes]);

      return createdEventType;
    }

    const createdEventType = await createOwnerEventType(input);

    try {
      const nextOwnerEventTypes = await refreshEventTypeState();

      return nextOwnerEventTypes.find((eventType) => eventType.id === createdEventType.id) ?? null;
    } catch {
      const fallbackOwnerEventType = toOwnerEventType(createdEventType);

      setOwnerEventTypes((currentEventTypes) => upsertById(currentEventTypes, fallbackOwnerEventType));
      setGuestEventTypes((currentEventTypes) => upsertById(currentEventTypes, createdEventType));
      setActionError("Тип события создан, но данные не удалось полностью обновить.");

      return fallbackOwnerEventType;
    }
  };

  const handleUpdateOwnerEventType = async (eventTypeId: string, input: OwnerEventTypeInput) => {
    if (isScenarioMode) {
      let updatedEventType: OwnerEventType | null = null;

      setOwnerEventTypes((currentEventTypes) =>
        currentEventTypes.map((eventType) => {
          if (eventType.id !== eventTypeId) {
            return eventType;
          }

          updatedEventType = {
            ...eventType,
            ...input,
          };

          return updatedEventType;
        }),
      );

      return updatedEventType;
    }

    const updatedEventType = await updateOwnerEventType(eventTypeId, input);

    try {
      const nextOwnerEventTypes = await refreshEventTypeState();

      return nextOwnerEventTypes.find((eventType) => eventType.id === eventTypeId) ?? null;
    } catch {
      setOwnerEventTypes((currentEventTypes) => upsertById(currentEventTypes, updatedEventType));

      if (updatedEventType.isArchived) {
        setGuestEventTypes((currentEventTypes) => removeById(currentEventTypes, eventTypeId));
        setAvailabilityByEventType((currentAvailability) =>
          removeAvailabilityEntry(currentAvailability, eventTypeId),
        );
      } else {
        setGuestEventTypes((currentEventTypes) =>
          upsertById(currentEventTypes, toGuestEventType(updatedEventType)),
        );
      }
      setActionError("Изменения сохранены, но данные не удалось полностью обновить.");

      return updatedEventType;
    }
  };

  const handleArchiveOwnerEventType = async (eventTypeId: string) => {
    if (isScenarioMode) {
      let archivedEventType: OwnerEventType | null = null;

      setOwnerEventTypes((currentEventTypes) =>
        currentEventTypes.map((eventType) => {
          if (eventType.id !== eventTypeId) {
            return eventType;
          }

          archivedEventType = {
            ...eventType,
            isArchived: true,
          };

          return archivedEventType;
        }),
      );

      return archivedEventType;
    }

    const archivedEventType = await archiveOwnerEventType(eventTypeId);

    try {
      const nextOwnerEventTypes = await refreshEventTypeState();

      return nextOwnerEventTypes.find((eventType) => eventType.id === eventTypeId) ?? null;
    } catch {
      setOwnerEventTypes((currentEventTypes) => upsertById(currentEventTypes, archivedEventType));
      setGuestEventTypes((currentEventTypes) => removeById(currentEventTypes, eventTypeId));
      setAvailabilityByEventType((currentAvailability) =>
        removeAvailabilityEntry(currentAvailability, eventTypeId),
      );
      setActionError("Тип события архивирован, но данные не удалось полностью обновить.");

      return archivedEventType;
    }
  };

  const handleDeleteOwnerEventType = async (eventTypeId: string) => {
    if (isScenarioMode) {
      let nextOwnerEventTypes: OwnerEventType[] = [];

      setOwnerEventTypes((currentEventTypes) => {
        nextOwnerEventTypes = currentEventTypes.filter((eventType) => eventType.id !== eventTypeId);
        return nextOwnerEventTypes;
      });

      return nextOwnerEventTypes;
    }

    await deleteOwnerEventType(eventTypeId);

    try {
      return await refreshEventTypeState();
    } catch {
      let nextOwnerEventTypes: OwnerEventType[] = [];

      setOwnerEventTypes((currentEventTypes) => {
        nextOwnerEventTypes = removeById(currentEventTypes, eventTypeId);
        return nextOwnerEventTypes;
      });
      setGuestEventTypes((currentEventTypes) => removeById(currentEventTypes, eventTypeId));
      setAvailabilityByEventType((currentAvailability) =>
        removeAvailabilityEntry(currentAvailability, eventTypeId),
      );
      setActionError("Тип события удален, но данные не удалось полностью обновить.");

      return nextOwnerEventTypes;
    }
  };

  return (
    <main className="app-shell app-shell--top">
      <div className="workspace-shell">
        {actionError ? (
          <p className="error-copy" role="alert">
            {actionError}
          </p>
        ) : null}
        <div
          className={`workspace-content${workspace === "public" && screen === "booking" ? " workspace-content--centered" : ""}`}
        >
          {workspace === "public" ? (
            screen === "home" ? (
              <PublicBookingsHome
                bookings={bookings}
                eventTypes={guestEventTypes}
                availableDatesByEventType={datesByEventType}
                calendarDays={calendarDays}
                initialSelectedDate={selectedHomeDate}
                startupWarning={publicStartupWarning}
                bookingsState={publicLoadStatuses.bookings}
                availabilityState={publicLoadStatuses.availability}
                bookingEntryDisabledReason={bookingEntryDisabledReason}
                isRetryingStartup={!isScenarioMode && loading}
                workspace="public"
                onChangeWorkspace={handleWorkspaceChange}
                onRetryStartup={
                  isScenarioMode ? undefined : () => setReloadToken((currentToken) => currentToken + 1)
                }
                onCancelBooking={(bookingId) => {
                  if (isScenarioMode) {
                    setBookings((currentBookings) => cancelPublicBooking(currentBookings, bookingId));
                    return;
                  }

                  setActionError("");

                  void cancelBooking(bookingId)
                    .then(() => {
                      return refreshPublicState(guestEventTypes);
                    })
                    .catch((error) => {
                      setActionError(
                        error instanceof Error
                          ? error.message
                          : "Не удалось отменить бронирование.",
                      );
                    });
                }}
                onStartBooking={(isoDate) => {
                  setSelectedHomeDate(isoDate);
                  setSuccessDestination("home");
                  setScreen("booking");
                }}
              />
            ) : (
              <GuestBookingPage
                eventTypes={guestEventTypes}
                datesByEventType={datesByEventType}
                initialSelectedDate={selectedHomeDate}
                successActionLabel={
                  successDestination === "home" ? "Вернуться к бронированиям" : undefined
                }
                onBookingSubmit={async (draft) => {
                  if (isScenarioMode) {
                    setBookings((currentBookings) => [
                      ...currentBookings,
                      createScenarioBooking(guestEventTypes, draft),
                    ]);
                    return;
                  }

                  setActionError("");

                  await createBooking(buildCreateBookingRequest(draft, guestEventTypes));
                  await refreshPublicState(guestEventTypes);
                }}
                onSuccessAction={
                  successDestination === "home"
                    ? () => {
                        setScreen("home");
                      }
                    : undefined
                }
              />
            )
          ) : workspace === "owner-event-types" ? (
            <OwnerEventTypesPage
              key={scenario ?? "remote"}
              eventTypes={ownerEventTypes}
              workspace={workspace}
              onChangeWorkspace={handleWorkspaceChange}
              loadError={ownerEventTypesError}
              onRetryLoad={isScenarioMode ? undefined : () => void retryOwnerEventTypesLoad()}
              onCreateEventType={handleCreateOwnerEventType}
              onUpdateEventType={handleUpdateOwnerEventType}
              onArchiveEventType={handleArchiveOwnerEventType}
              onDeleteEventType={handleDeleteOwnerEventType}
            />
          ) : (
            <OwnerSettingsPage
              key={scenario ?? "remote"}
              workspace={workspace}
              onChangeWorkspace={handleWorkspaceChange}
            />
          )}
        </div>
      </div>
    </main>
  );
}
