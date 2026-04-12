import { GuestBookingPage } from "./components/GuestBookingPage";
import {
  multiEventTypes,
  noEventTypes,
  singleEventType,
  slotDates,
} from "./data/mockGuestFlow";

type AppProps = {
  scenario?: "none" | "single" | "multi";
};

export default function App({ scenario = "multi" }: AppProps) {
  const eventTypes =
    scenario === "multi"
      ? multiEventTypes
      : scenario === "single"
        ? singleEventType
        : noEventTypes;

  return (
    <main className="app-shell">
      <GuestBookingPage eventTypes={eventTypes} dates={slotDates} />
    </main>
  );
}
