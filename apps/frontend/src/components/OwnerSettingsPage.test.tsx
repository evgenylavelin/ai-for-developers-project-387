import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetScheduleCache } from "../lib/scheduleApi";
import { OwnerSettingsPage } from "./OwnerSettingsPage";

const loadedSchedule = {
  workingDays: ["monday", "wednesday"],
  startTime: "09:00",
  endTime: "18:00",
};

function mockScheduleGetResponse(schedule = loadedSchedule) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => schedule,
    }),
  );
}

beforeEach(() => {
  resetScheduleCache();
  mockScheduleGetResponse();
});

afterEach(() => {
  resetScheduleCache();
  vi.unstubAllGlobals();
});

describe("OwnerSettingsPage", () => {
  it("loads the saved schedule on mount", async () => {
    render(
      <OwnerSettingsPage workspace="owner-settings" onChangeWorkspace={() => undefined} />,
    );

    expect(await screen.findByDisplayValue("09:00")).toBeInTheDocument();
    expect(screen.getByDisplayValue("18:00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Понедельник" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Среда" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Понедельник, Среда")).toBeInTheDocument();
  });

  it("displays time fields as selects with 24-hour format options", async () => {
    render(
      <OwnerSettingsPage workspace="owner-settings" onChangeWorkspace={() => undefined} />,
    );

    const startSelect = await screen.findByDisplayValue("09:00");
    const endSelect = screen.getByDisplayValue("18:00");

    expect(startSelect.tagName).toBe("SELECT");
    expect(endSelect.tagName).toBe("SELECT");

    const startOptions = within(startSelect as HTMLElement).getAllByRole("option");
    const endOptions = within(endSelect as HTMLElement).getAllByRole("option");

    for (const option of [...startOptions, ...endOptions]) {
      const value = (option as HTMLOptionElement).value;
      if (!value) {
        continue;
      }
      expect(value).toMatch(/^\d{2}:\d{2}$/);
      expect(value).not.toMatch(/AM|PM/i);
    }

    expect(startOptions.some((o) => (o as HTMLOptionElement).value === "09:00")).toBe(true);
    expect(endOptions.some((o) => (o as HTMLOptionElement).value === "18:00")).toBe(true);
  });

  it("shows inline validation when the owner tries to save an empty working-day selection", async () => {
    const user = userEvent.setup();

    render(
      <OwnerSettingsPage workspace="owner-settings" onChangeWorkspace={() => undefined} />,
    );

    await screen.findByDisplayValue("09:00");
    await user.click(screen.getByRole("button", { name: "Понедельник" }));
    await user.click(screen.getByRole("button", { name: "Среда" }));
    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Выберите хотя бы один рабочий день.");
  });

  it("shows a backend error message when saving fails", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(globalThis.fetch);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => loadedSchedule,
    } as Response);
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Сервер недоступен." }),
      text: async () => JSON.stringify({ message: "Сервер недоступен." }),
    } as Response);

    render(
      <OwnerSettingsPage workspace="owner-settings" onChangeWorkspace={() => undefined} />,
    );

    await screen.findByDisplayValue("09:00");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Сервер недоступен.");
  });

  it("shows a blocking load error with retry instead of an editable fallback form", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        text: async () => "",
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => loadedSchedule,
      });

    vi.stubGlobal("fetch", fetchMock);

    render(
      <OwnerSettingsPage workspace="owner-settings" onChangeWorkspace={() => undefined} />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось загрузить расписание.");
    expect(screen.queryByRole("button", { name: "Сохранить" })).not.toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", { name: "Повторить загрузку" }));

    expect(await screen.findByDisplayValue("09:00")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("disables schedule controls while saving is in flight", async () => {
    const user = userEvent.setup();
    let resolveSave: ((value: Response | PromiseLike<Response>) => void) | undefined;

    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => loadedSchedule,
        })
        .mockImplementationOnce(
          () =>
            new Promise<Response>((resolve) => {
              resolveSave = resolve;
            }),
        ),
    );

    render(
      <OwnerSettingsPage workspace="owner-settings" onChangeWorkspace={() => undefined} />,
    );

    await screen.findByDisplayValue("09:00");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(screen.getByRole("button", { name: "Сохраняем..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Понедельник" })).toBeDisabled();
    expect(screen.getByDisplayValue("09:00")).toBeDisabled();
    expect(screen.getByDisplayValue("18:00")).toBeDisabled();

    if (resolveSave === undefined) {
      throw new Error("Expected pending save resolver to be captured.");
    }

    resolveSave({
      ok: true,
      json: async () => loadedSchedule,
    } as Response);

    expect(await screen.findByRole("status")).toHaveTextContent("Расписание сохранено.");
  });
});
