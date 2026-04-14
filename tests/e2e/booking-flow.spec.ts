import { expect, test } from "@playwright/test";

import {
  cleanupE2eEventTypes,
  cleanupEventType,
  createConflictingBooking,
  isSlotStillAvailable,
  listBookings,
  prepareBookableEventType,
  type AvailableSlot,
} from "./helpers/api";

const shortWeekdayFormatter = new Intl.DateTimeFormat("ru-RU", {
  weekday: "short",
  timeZone: "UTC",
});

const fullDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

function capitalize(value: string): string {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

function formatCalendarDayLabel(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  const weekdayShort = capitalize(shortWeekdayFormatter.format(date).replace(".", ""));

  return `${weekdayShort} ${date.getUTCDate()}`;
}

function formatFullDateLabel(isoDateTime: string): string {
  return capitalize(fullDateFormatter.format(new Date(isoDateTime)));
}

async function openBookingFlow(
  page: import("@playwright/test").Page,
  eventTypeTitle: string,
  slot: AvailableSlot,
) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Бронирования" })).toBeVisible();
  await page.getByRole("button", { name: formatFullDateLabel(slot.startAt) }).click();

  const startBookingButton = page.getByRole("button", { name: "Записаться" });

  await expect(startBookingButton).toBeEnabled();
  await startBookingButton.click();

  const eventTypeHeading = page.getByRole("heading", { name: "Выберите тип встречи" });

  if (await eventTypeHeading.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: eventTypeTitle }).click();
    await page.getByRole("button", { name: "Далее" }).click();
  }

  await expect(page.getByRole("heading", { name: "Выберите дату и время" })).toBeVisible();

  const slotTime = slot.startAt.slice(11, 16);
  const targetSlotButton = page.getByRole("button", { name: slotTime });

  if (!(await targetSlotButton.isVisible().catch(() => false))) {
    await page.getByRole("button", { name: formatCalendarDayLabel(slot.startAt) }).click();
  }

  await targetSlotButton.click();
  await page.getByRole("button", { name: "Далее" }).click();
  await expect(page.getByRole("heading", { name: "Введите контактные данные" })).toBeVisible();
}

async function openBookingDateTimeStep(
  page: import("@playwright/test").Page,
  eventTypeTitle: string,
  slot: AvailableSlot,
) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Бронирования" })).toBeVisible();
  await page.getByRole("button", { name: formatFullDateLabel(slot.startAt) }).click();

  const startBookingButton = page.getByRole("button", { name: "Записаться" });

  await expect(startBookingButton).toBeEnabled();
  await startBookingButton.click();

  const eventTypeHeading = page.getByRole("heading", { name: "Выберите тип встречи" });

  if (await eventTypeHeading.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: eventTypeTitle }).click();
    await page.getByRole("button", { name: "Далее" }).click();
  }

  await expect(page.getByRole("heading", { name: "Выберите дату и время" })).toBeVisible();
  await page.getByRole("button", { name: formatCalendarDayLabel(slot.startAt) }).click();
}

test.describe("guest booking flow", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await cleanupE2eEventTypes();
    await page.addInitScript(() => {
      window.localStorage.clear();
    });
  });

  test.afterAll(async () => {
    await cleanupE2eEventTypes();
  });

  test("books a slot successfully", async ({ page }, testInfo) => {
    const beforeCount = (await listBookings()).length;
    const { eventType, firstSlot } = await prepareBookableEventType(testInfo.title);
    const guestEmail = "ivan@example.com";

    try {
      await openBookingFlow(page, eventType.title, firstSlot);
      await page.getByLabel("Имя").fill("Иван Петров");
      await page.getByLabel("Email").fill(guestEmail);
      await page.getByRole("button", { name: "Подтвердить" }).click();

      await expect(page.getByRole("heading", { name: "Бронирование подтверждено" })).toBeVisible();
      await expect(page.getByText(guestEmail)).toBeVisible();
      await expect(page.getByText(eventType.title)).toBeVisible();
      await expect(page.getByText(firstSlot.startAt.slice(11, 16))).toBeVisible();

      await openBookingDateTimeStep(page, eventType.title, firstSlot);
      await expect(page.getByRole("button", { name: firstSlot.startAt.slice(11, 16) })).toHaveCount(0);

      const bookings = await listBookings();
      expect(bookings).toHaveLength(beforeCount + 1);
      expect(
        bookings.some(
          (booking) =>
            booking.eventTypeId === eventType.id &&
            booking.guestEmail === guestEmail &&
            booking.startAt === firstSlot.startAt &&
            booking.endAt === firstSlot.endAt,
        ),
      ).toBe(true);
      await expect.poll(async () => isSlotStillAvailable(eventType.id, firstSlot)).toBe(false);
    } finally {
      await cleanupEventType(eventType.id);
    }
  });

  test("shows a conflict when the slot becomes unavailable before submit", async ({ page }, testInfo) => {
    const beforeCount = (await listBookings()).length;
    const { eventType, firstSlot } = await prepareBookableEventType(testInfo.title);

    try {
      await openBookingFlow(page, eventType.title, firstSlot);
      await createConflictingBooking(firstSlot, eventType.id);

      await page.getByLabel("Имя").fill("Анна Смирнова");
      await page.getByLabel("Email").fill("anna@example.com");
      await page.getByRole("button", { name: "Подтвердить" }).click();

      await expect(page.getByRole("heading", { name: "Введите контактные данные" })).toBeVisible();
      await expect(page.getByText("The selected slot is no longer available.")).toBeVisible();

      const bookings = await listBookings();
      expect(bookings).toHaveLength(beforeCount + 1);
      expect(
        bookings.filter((booking) => booking.startAt === firstSlot.startAt && booking.endAt === firstSlot.endAt),
      ).toHaveLength(1);
    } finally {
      await cleanupEventType(eventType.id);
    }
  });

  test("shows validation errors for empty and invalid contacts", async ({ page }, testInfo) => {
    const beforeCount = (await listBookings()).length;
    const { eventType, firstSlot } = await prepareBookableEventType(testInfo.title);

    try {
      await openBookingFlow(page, eventType.title, firstSlot);
      await page.getByRole("button", { name: "Подтвердить" }).click();

      await expect(
        page.getByText("Заполните имя и email, чтобы подтвердить бронирование."),
      ).toBeVisible();

      await page.getByLabel("Имя").fill("Тестовый гость");
      await page.getByLabel("Email").fill("broken-email");
      await page.getByRole("button", { name: "Подтвердить" }).click();

      await expect(page.getByText("Укажите корректный email.")).toBeVisible();
      expect((await listBookings()).length).toBe(beforeCount);
    } finally {
      await cleanupEventType(eventType.id);
    }
  });
});