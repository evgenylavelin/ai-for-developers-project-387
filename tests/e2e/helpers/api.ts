type OwnerSchedule = {
  workingDays: string[];
  startTime: string;
  endTime: string;
};

type EventType = {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
};

type OwnerEventType = EventType & {
  isArchived: boolean;
  hasBookings: boolean;
};

export type AvailableSlot = {
  startAt: string;
  endAt: string;
};

type Booking = {
  id: string;
  eventTypeId: string;
  startAt: string;
  endAt: string;
  guestName: string;
  guestEmail: string;
  status: string;
};

const backendPort = process.env.PLAYWRIGHT_BACKEND_PORT ?? "3001";
const apiBaseUrl =
  process.env.PLAYWRIGHT_API_BASE_URL ?? `http://127.0.0.1:${backendPort}`;
const E2E_EVENT_TYPE_PREFIX = "E2E Playwright";
const DEFAULT_SCHEDULE: OwnerSchedule = {
  workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  startTime: "09:00",
  endTime: "12:00",
};

function buildUrl(path: string): string {
  return `${apiBaseUrl}${path}`;
}

function sanitizeLabel(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^A-Za-z0-9А-Яа-яЁё _-]/g, "")
    .slice(0, 40);
}

function buildE2eEventTypeTitle(label: string): string {
  const suffix = sanitizeLabel(label) || "booking-flow";

  return `${E2E_EVENT_TYPE_PREFIX} ${suffix} ${Date.now()}`;
}

async function expectOk(response: Response, context: string) {
  if (!response.ok) {
    throw new Error(`${context} failed with ${response.status}: ${await response.text()}`);
  }
}

async function parseJsonResponse<T>(response: Response, context: string): Promise<T> {
  await expectOk(response, context);

  return (await response.json()) as T;
}

export async function listBookings(): Promise<Booking[]> {
  const response = await fetch(buildUrl("/bookings"));

  return parseJsonResponse<Booking[]>(response, "list bookings");
}

export async function listOwnerEventTypes(): Promise<OwnerEventType[]> {
  const response = await fetch(buildUrl("/owner/event-types"));

  return parseJsonResponse<OwnerEventType[]>(response, "list owner event types");
}

export async function cleanupEventType(eventTypeId: string) {
  const eventTypes = await listOwnerEventTypes();
  const eventType = eventTypes.find((item) => item.id === eventTypeId);

  if (!eventType) {
    return;
  }

  if (eventType.hasBookings) {
    if (eventType.isArchived) {
      return;
    }

    const archiveResponse = await fetch(buildUrl(`/owner/event-types/${eventTypeId}:archive`), {
      method: "POST",
    });

    await expectOk(archiveResponse, "archive event type");

    return;
  }

  const deleteResponse = await fetch(buildUrl(`/owner/event-types/${eventTypeId}`), {
    method: "DELETE",
  });

  if (deleteResponse.status !== 204) {
    throw new Error(`delete event type failed with ${deleteResponse.status}: ${await deleteResponse.text()}`);
  }
}

export async function cleanupE2eEventTypes() {
  const eventTypes = await listOwnerEventTypes();

  for (const eventType of eventTypes) {
    if (!eventType.title.startsWith(E2E_EVENT_TYPE_PREFIX)) {
      continue;
    }

    await cleanupEventType(eventType.id);
  }
}

export async function prepareBookableEventType(label: string) {
  await cleanupE2eEventTypes();

  const updateScheduleResponse = await fetch(buildUrl("/schedule"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(DEFAULT_SCHEDULE),
  });

  await expectOk(updateScheduleResponse, "schedule setup");

  const createEventTypeResponse = await fetch(buildUrl("/owner/event-types"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: buildE2eEventTypeTitle(label),
      description: "Playwright e2e test event type.",
      durationMinutes: 60,
    }),
  });

  const eventType = await parseJsonResponse<EventType>(createEventTypeResponse, "event type setup");
  const availabilityResponse = await fetch(buildUrl(`/event-types/${eventType.id}/availability`));
  const availability = await parseJsonResponse<AvailableSlot[]>(
    availabilityResponse,
    "availability setup",
  );

  if (availability.length === 0) {
    throw new Error("No availability returned for e2e setup.");
  }

  return {
    eventType,
    firstSlot: availability[0],
  };
}

export async function createConflictingBooking(slot: AvailableSlot, eventTypeId: string) {
  const response = await fetch(buildUrl("/bookings"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventTypeId,
      startAt: slot.startAt,
      endAt: slot.endAt,
      guestName: "Conflict Guest",
      guestEmail: "conflict@example.com",
    }),
  });

  return parseJsonResponse<Booking>(response, "conflicting booking setup");
}

export async function isSlotStillAvailable(eventTypeId: string, slot: AvailableSlot): Promise<boolean> {
  const response = await fetch(buildUrl(`/event-types/${eventTypeId}/availability`));
  const availability = await parseJsonResponse<AvailableSlot[]>(response, "availability reload");

  return availability.some(
    (item) => item.startAt === slot.startAt && item.endAt === slot.endAt,
  );
}