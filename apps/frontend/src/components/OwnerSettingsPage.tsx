import { useEffect, useState, type FormEvent } from "react";

import { WorkspaceHero } from "./WorkspaceHero";
import {
  createEmptyOwnerSchedule,
  toggleWorkingDay,
  validateOwnerScheduleForm,
  weekdayOptions,
} from "../lib/ownerSchedule";
import { getSchedule, updateSchedule } from "../lib/scheduleApi";
import type { DayOfWeek, OwnerSchedule, Workspace } from "../types";

type OwnerSettingsPageProps = {
  workspace: Workspace;
  onChangeWorkspace: (workspace: Workspace) => void;
};

function formatWorkingDays(workingDays: DayOfWeek[]): string {
  if (workingDays.length === 0) {
    return "Дни не выбраны";
  }

  return weekdayOptions
    .filter((weekday) => workingDays.includes(weekday.value))
    .map((weekday) => weekday.label)
    .join(", ");
}

export function OwnerSettingsPage({
  workspace,
  onChangeWorkspace,
}: OwnerSettingsPageProps) {
  const [schedule, setSchedule] = useState<OwnerSchedule>(createEmptyOwnerSchedule());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let alive = true;

    async function loadSchedule() {
      setLoading(true);
      setLoadError("");

      try {
        const loadedSchedule = await getSchedule();

        if (!alive) {
          return;
        }

        setSchedule(loadedSchedule);
        setFormError("");
        setFeedback("");
      } catch {
        if (!alive) {
          return;
        }

        setLoadError("Не удалось загрузить расписание.");
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    void loadSchedule();

    return () => {
      alive = false;
    };
  }, [reloadToken]);

  const handleDayToggle = (day: DayOfWeek) => {
    if (saving) {
      return;
    }

    setSchedule((currentSchedule) => toggleWorkingDay(currentSchedule, day));
    setFormError("");
    setFeedback("");
  };

  const handleTimeChange = (field: "startTime" | "endTime", value: string) => {
    if (saving) {
      return;
    }

    setSchedule((currentSchedule) => ({ ...currentSchedule, [field]: value }));
    setFormError("");
    setFeedback("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (saving || loading || loadError) {
      return;
    }

    const validationError = validateOwnerScheduleForm(schedule);

    if (validationError) {
      setFormError(validationError);
      setFeedback("");
      return;
    }

    setSaving(true);
    setFormError("");
    setFeedback("");

    try {
      const savedSchedule = await updateSchedule(schedule);
      setSchedule(savedSchedule);
      setFeedback("Расписание сохранено.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Не удалось сохранить расписание.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="workspace-page owner-workspace">
      <WorkspaceHero
        eyebrow="Call Planner"
        title="Настройки"
        description="Настройте рабочие дни и единое время приема, чтобы публичные слоты строились по одному графику."
        workspace={workspace}
        onChangeWorkspace={onChangeWorkspace}
        className="workspace-hero--owner"
        navAriaLabel="Разделы рабочего пространства"
        meta={
          <>
            <span className="owner-kpi">
              <strong>{schedule.workingDays.length}</strong>
              <span>рабочих дней</span>
            </span>
            <span className="owner-kpi">
              <strong>{schedule.startTime && schedule.endTime ? `${schedule.startTime}–${schedule.endTime}` : "—"}</strong>
              <span>единый интервал</span>
            </span>
          </>
        }
      />

      <div className="owner-settings-layout">
        <section className="owner-card owner-settings-panel" aria-label="Рабочие дни и время">
          <div className="owner-list-panel__header">
            <div>
              <p className="bookings-card__eyebrow">Рабочие дни и время</p>
            </div>
          </div>

          {loading ? (
            <p className="empty-copy">Загружаем расписание...</p>
          ) : null}

          {loadError ? (
            <p className="error-copy" role="alert">
              {loadError}
            </p>
          ) : null}

          {!loading && !loadError ? (
            <form className="owner-schedule-form" onSubmit={handleSubmit}>
              <div className="stack owner-form-fields">
                <fieldset className="owner-weekday-fieldset" aria-required="true">
                  <legend>
                    <span className="field-label">
                      <span>Рабочие дни</span>
                      <span className="required-mark" aria-hidden="true">
                        *
                      </span>
                    </span>
                  </legend>
                  <div className="owner-weekday-grid">
                    {weekdayOptions.map((weekday) => {
                      const selected = schedule.workingDays.includes(weekday.value);

                      return (
                        <button
                          key={weekday.value}
                          type="button"
                          className={`owner-weekday-toggle${selected ? " owner-weekday-toggle--active" : ""}`}
                          aria-pressed={selected}
                          aria-label={weekday.label}
                          disabled={saving}
                          onClick={() => handleDayToggle(weekday.value)}
                        >
                          <span className="owner-weekday-toggle__short">{weekday.shortLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="owner-time-grid">
                  <label className="field">
                    <span className="field-label">
                      <span>Начало</span>
                      <span className="required-mark" aria-hidden="true">
                        *
                      </span>
                    </span>
                    <input
                      type="time"
                      lang="ru"
                      value={schedule.startTime}
                      required
                      disabled={saving}
                      onChange={(event) => handleTimeChange("startTime", event.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">
                      <span>Окончание</span>
                      <span className="required-mark" aria-hidden="true">
                        *
                      </span>
                    </span>
                    <input
                      type="time"
                      lang="ru"
                      value={schedule.endTime}
                      required
                      disabled={saving}
                      onChange={(event) => handleTimeChange("endTime", event.target.value)}
                    />
                  </label>
                </div>

                <div className="owner-schedule-summary" aria-label="Текущее расписание">
                  <p className="owner-schedule-summary__label">Выбрано</p>
                  <p className="owner-schedule-summary__value">
                    {formatWorkingDays(schedule.workingDays)}
                  </p>
                </div>
              </div>

              {formError ? (
                <p
                  id="owner-schedule-form-error"
                  className="error-copy"
                  role="alert"
                  aria-live="assertive"
                  aria-atomic="true"
                >
                  {formError}
                </p>
              ) : null}

              {feedback ? (
                <p className="owner-feedback" role="status" aria-live="polite" aria-atomic="true">
                  {feedback}
                </p>
              ) : null}

              <div className="owner-form-actions">
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? "Сохраняем..." : "Сохранить"}
                </button>
              </div>
            </form>
          ) : null}

          {!loading && loadError ? (
            <div className="owner-form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setReloadToken((currentToken) => currentToken + 1)}
              >
                Повторить загрузку
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}
