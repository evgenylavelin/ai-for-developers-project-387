import { useEffect, useState } from "react";

import { GuestBookingPage } from "./components/GuestBookingPage";
import { OwnerEventTypesPage } from "./components/OwnerEventTypesPage";
import { OwnerSettingsPage } from "./components/OwnerSettingsPage";
import { PublicBookingsHome } from "./components/PublicBookingsHome";
import {
  bookingSchedule,
  multiEventTypes,
  noEventTypes,
  publicBookings,
  singleEventType,
} from "./data/mockGuestFlow";
import { mockOwnerEventTypes } from "./data/mockOwnerEventTypes";
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
import type {
  AvailabilityByEventType,
  Booking,
  BookingDraft,
  CreateBookingRequest,
  EventType,
  OwnerEventType,
  OwnerEventTypeInput,
  ScheduleDay,
  Workspace,
} from "./types";

type AppProps = {
  scenario?: "none" | "single" | "multi" | "public";
};

type ScenarioData = {
  bookings: Booking[];
  eventTypes: EventType[];
  schedule: typeof bookingSchedule;
};

function getScenarioData(scenario: NonNullable<AppProps["scenario"]>): ScenarioData {
  if (scenario === "none") {
    return {
      bookings: [],
      eventTypes: noEventTypes,
      schedule: bookingSchedule,
    };
  }

  if (scenario === "single") {
    return {
      bookings: [],
      eventTypes: singleEventType,
      schedule: bookingSchedule,
    };
  }

  if (scenario === "multi") {
    return {
      bookings: [],
      eventTypes: multiEventTypes,
      schedule: bookingSchedule,
    };
  }

  return {
    bookings: publicBookings,
    eventTypes: multiEventTypes,
    schedule: bookingSchedule,
  };
}

function buildScenarioAvailability(schedule: ScheduleDay[], eventTypes: EventType[]): AvailabilityByEventType {
  return Object.fromEntries(
    eventTypes.map((eventType) => [
      eventType.id,
      schedule.flatMap((day) =>
        (day.slotsByEventType[eventType.id] ?? []).map((time) => ({
          startAt: `${day.isoDate}T${time}:00Z`,
          endAt: `${day.isoDate}T${time}:00Z`,
        })),
      ),
    ]),
  );
}

function buildCreateBookingRequest(draft: BookingDraft, eventTypes: EventType[]): CreateBookingRequest {
  const eventType = eventTypes.find((item) => item.id === draft.eventTypeId);

  if (!eventType) {
    throw new Error(`Unknown event type: ${draft.eventTypeId}`);
  }

  const [hours, minutes] = draft.time.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + eventType.durationMinutes;
  const endHours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const endMinutes = (totalMinutes % 60).toString().padStart(2, "0");

  return {
    eventTypeId: draft.eventTypeId,
    startAt: `${draft.isoDate}T${draft.time}:00Z`,
    endAt: `${draft.isoDate}T${endHours}:${endMinutes}:00Z`,
    guestName: draft.guestName.trim(),
    guestEmail: draft.guestEmail.trim(),
  };
}

function createScenarioBooking(eventTypes: EventType[], draft: BookingDraft): Booking {
  const request = buildCreateBookingRequest(draft, eventTypes);

  return {
    id: `booking-${draft.eventTypeId}-${draft.isoDate}-${draft.time}`,
    ...request,
    status: "active",
  };
}

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
    scenarioData ? mockOwnerEventTypes : [],
  );
  const [bookings, setBookings] = useState<Booking[]>(scenarioData?.bookings ?? []);
  const [availabilityByEventType, setAvailabilityByEventType] = useState<AvailabilityByEventType>(
    scenarioData ? buildScenarioAvailability(scenarioData.schedule, scenarioData.eventTypes) : {},
  );
  const [loading, setLoading] = useState(!scenarioData);
  const [initialLoadError, setInitialLoadError] = useState("");
  const [ownerEventTypesError, setOwnerEventTypesError] = useState("");
  const [actionError, setActionError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [screen, setScreen] = useState<"home" | "booking">(
    scenarioData?.bookings.length ? "home" : "booking",
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
    setOwnerEventTypes(mockOwnerEventTypes);
    setBookings(nextScenarioData.bookings);
    setAvailabilityByEventType(
      buildScenarioAvailability(nextScenarioData.schedule, nextScenarioData.eventTypes),
    );
    setLoading(false);
    setInitialLoadError("");
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
      setInitialLoadError("");

      try {
        const [loadedGuestEventTypes, loadedBookings] = await Promise.all([
          getGuestEventTypes(),
          listBookings(),
        ]);

        const loadedAvailability = Object.fromEntries(
          await Promise.all(
            loadedGuestEventTypes.map(async (eventType) => [eventType.id, await getAvailability(eventType.id)]),
          ),
        ) as AvailabilityByEventType;

        if (!alive) {
          return;
        }

        const remoteCalendarDays = buildPublicCalendarDays();

        setGuestEventTypes(loadedGuestEventTypes);
        setBookings(loadedBookings);
        setAvailabilityByEventType(loadedAvailability);
        setOwnerEventTypesError("");
        setActionError("");
        setScreen(loadedBookings.length > 0 ? "home" : "booking");
        setSuccessDestination(loadedBookings.length > 0 ? "home" : "restart");
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
      } catch (error) {
        if (!alive) {
          return;
        }

        setInitialLoadError(
          error instanceof Error ? error.message : "Не удалось загрузить данные приложения.",
        );
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

  const schedule = scenarioData?.schedule ?? [];
  const calendarDays = isScenarioMode
    ? schedule.map(({ slotsByEventType: _slotsByEventType, ...day }) => day)
    : buildPublicCalendarDays();

  const datesByEventType = isScenarioMode
    ? buildAvailableDatesFromSchedule(schedule, guestEventTypes, bookings)
    : buildAvailableDatesFromAvailability(availabilityByEventType, calendarDays);

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

  if (!isScenarioMode && loading) {
    return (
      <main className="app-shell app-shell--top">
        <div className="workspace-shell">
          <section className="panel">
            <p className="eyebrow">Call Planner</p>
            <h1>Загружаем данные</h1>
            <p className="panel-copy">Получаем типы событий, бронирования и доступные слоты.</p>
          </section>
        </div>
      </main>
    );
  }

  if (!isScenarioMode && initialLoadError) {
    return (
      <main className="app-shell app-shell--top">
        <div className="workspace-shell">
          <section className="panel">
            <p className="eyebrow">Call Planner</p>
            <h1>Не удалось загрузить данные</h1>
            <p className="error-copy" role="alert">
              {initialLoadError}
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => setReloadToken((currentToken) => currentToken + 1)}
            >
              Повторить
            </button>
          </section>
        </div>
      </main>
    );
  }

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
                workspace="public"
                onChangeWorkspace={handleWorkspaceChange}
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
