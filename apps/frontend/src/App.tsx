import { useEffect, useState } from "react";

import { GuestBookingPage } from "./components/GuestBookingPage";
import { OwnerEventTypesPage } from "./components/OwnerEventTypesPage";
import { PublicBookingsHome } from "./components/PublicBookingsHome";
import {
  bookingSchedule,
  multiEventTypes,
  noEventTypes,
  publicBookings,
  singleEventType,
} from "./data/mockGuestFlow";
import { mockOwnerEventTypes } from "./data/mockOwnerEventTypes";
import {
  buildAvailableDatesByEventType,
  cancelPublicBooking,
  createMockBooking,
  getInitialSelectedDate,
} from "./lib/publicBookings";
import type { Booking, EventType, ScheduleDay } from "./types";

type AppProps = {
  scenario?: "none" | "single" | "multi" | "public";
};

type ScenarioData = {
  bookings: Booking[];
  eventTypes: EventType[];
  schedule: ScheduleDay[];
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

export default function App({ scenario = "public" }: AppProps) {
  const scenarioData = getScenarioData(scenario);
  const [workspace, setWorkspace] = useState<"public" | "owner">("public");
  const [bookings, setBookings] = useState(scenarioData.bookings);
  const [screen, setScreen] = useState<"home" | "booking">(
    scenarioData.bookings.length > 0 ? "home" : "booking",
  );
  const [successDestination, setSuccessDestination] = useState<"restart" | "home">(
    scenarioData.bookings.length > 0 ? "home" : "restart",
  );
  const [selectedHomeDate, setSelectedHomeDate] = useState(
    getInitialSelectedDate(scenarioData.schedule, scenarioData.bookings),
  );

  useEffect(() => {
    const nextScenarioData = getScenarioData(scenario);

    setWorkspace("public");
    setBookings(nextScenarioData.bookings);
    setScreen(nextScenarioData.bookings.length > 0 ? "home" : "booking");
    setSuccessDestination(nextScenarioData.bookings.length > 0 ? "home" : "restart");
    setSelectedHomeDate(getInitialSelectedDate(nextScenarioData.schedule, nextScenarioData.bookings));
  }, [scenario]);

  const datesByEventType = buildAvailableDatesByEventType(
    scenarioData.schedule,
    scenarioData.eventTypes,
    bookings,
  );

  const handleWorkspaceChange = (nextWorkspace: "public" | "owner") => {
    setWorkspace(nextWorkspace);
  };

  return (
    <main className="app-shell app-shell--top">
      <div className="workspace-shell">
        <div
          className={`workspace-content${workspace === "public" && screen === "booking" ? " workspace-content--centered" : ""}`}
        >
          {workspace === "public" ? (
            screen === "home" ? (
              <PublicBookingsHome
                bookings={bookings}
                eventTypes={scenarioData.eventTypes}
                initialSelectedDate={selectedHomeDate}
                schedule={scenarioData.schedule}
                workspace={workspace}
                onChangeWorkspace={handleWorkspaceChange}
                onCancelBooking={(bookingId) => {
                  setBookings((currentBookings) => cancelPublicBooking(currentBookings, bookingId));
                }}
                onStartBooking={(isoDate) => {
                  setSelectedHomeDate(isoDate);
                  setSuccessDestination("home");
                  setScreen("booking");
                }}
              />
            ) : (
              <GuestBookingPage
                eventTypes={scenarioData.eventTypes}
                datesByEventType={datesByEventType}
                initialSelectedDate={selectedHomeDate}
                successActionLabel={
                  successDestination === "home" ? "Вернуться к бронированиям" : undefined
                }
                onBookingSubmit={(draft) => {
                  setBookings((currentBookings) => [
                    ...currentBookings,
                    createMockBooking(scenarioData.eventTypes, draft),
                  ]);
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
          ) : (
            <OwnerEventTypesPage
              key={scenario}
              initialEventTypes={mockOwnerEventTypes}
              workspace={workspace}
              onChangeWorkspace={handleWorkspaceChange}
            />
          )}
        </div>
      </div>
    </main>
  );
}
