import { useEffect, useRef, useState } from "react";

import {
  buildOwnerEventTypeForm,
  buildOwnerEventTypeInput,
  createEmptyOwnerEventTypeForm,
  validateOwnerEventTypeForm,
} from "../lib/ownerEventTypes";
import type { OwnerEventType, OwnerEventTypeForm, OwnerEventTypeInput, Workspace } from "../types";
import { OwnerWorkspaceNav } from "./OwnerWorkspaceNav";

type OwnerEventTypesPageProps = {
  eventTypes: OwnerEventType[];
  workspace: Workspace;
  onChangeWorkspace: (workspace: Workspace) => void;
  loadError?: string;
  onRetryLoad?: () => void;
  onCreateEventType: (input: OwnerEventTypeInput) => Promise<OwnerEventType | null>;
  onUpdateEventType: (
    eventTypeId: string,
    input: OwnerEventTypeInput,
  ) => Promise<OwnerEventType | null>;
  onArchiveEventType: (eventTypeId: string) => Promise<OwnerEventType | null>;
  onDeleteEventType: (eventTypeId: string) => Promise<OwnerEventType[]>;
};

type PendingAction = "delete" | "archive" | null;

function formatDuration(durationMinutes: number): string {
  return `${durationMinutes} мин`;
}

function getStatusBadges(eventType: OwnerEventType): string[] {
  const badges = [eventType.isArchived ? "Архив" : "Активен"];

  if (eventType.hasBookings) {
    badges.push("Использовался в бронированиях");
  }

  return badges;
}

function getValidationErrorField(error: string): keyof OwnerEventTypeForm | null {
  if (error === "Укажите название типа события.") {
    return "title";
  }

  if (error === "Добавьте короткое описание типа события.") {
    return "description";
  }

  if (error === "Длительность должна быть указана в минутах и быть больше нуля.") {
    return "durationMinutes";
  }

  return null;
}

export function OwnerEventTypesPage({
  eventTypes,
  workspace,
  onChangeWorkspace,
  loadError,
  onRetryLoad,
  onCreateEventType,
  onUpdateEventType,
  onArchiveEventType,
  onDeleteEventType,
}: OwnerEventTypesPageProps) {
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<string | null>(eventTypes[0]?.id ?? null);
  const [form, setForm] = useState<OwnerEventTypeForm>(
    eventTypes[0]
      ? buildOwnerEventTypeForm(eventTypes[0])
      : createEmptyOwnerEventTypeForm(),
  );
  const [mode, setMode] = useState<"create" | "edit">(eventTypes[0] ? "edit" : "create");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [submitting, setSubmitting] = useState(false);
  const cancelActionButtonRef = useRef<HTMLButtonElement | null>(null);
  const errorField = getValidationErrorField(error);

  useEffect(() => {
    if (eventTypes.length === 0) {
      setSelectedEventTypeId(null);
      setForm(createEmptyOwnerEventTypeForm());
      setMode("create");
      setPendingAction(null);
      return;
    }

    const nextSelectedEventType =
      (selectedEventTypeId ? eventTypes.find((eventType) => eventType.id === selectedEventTypeId) : null) ??
      eventTypes[0];

    setSelectedEventTypeId(nextSelectedEventType.id);
    setForm(buildOwnerEventTypeForm(nextSelectedEventType));
    setMode("edit");
    setPendingAction(null);
  }, [eventTypes]);

  const selectedEventType =
    mode === "edit" ? eventTypes.find((eventType) => eventType.id === selectedEventTypeId) ?? null : null;

  const openCreateMode = () => {
    if (submitting) {
      return;
    }

    setMode("create");
    setSelectedEventTypeId(null);
    setForm(createEmptyOwnerEventTypeForm());
    setError("");
    setFeedback("");
    setPendingAction(null);
  };

  const selectEventType = (eventType: OwnerEventType) => {
    if (submitting) {
      return;
    }

    setMode("edit");
    setSelectedEventTypeId(eventType.id);
    setForm(buildOwnerEventTypeForm(eventType));
    setError("");
    setFeedback("");
    setPendingAction(null);
  };

  const handleFieldChange = (field: keyof OwnerEventTypeForm, value: string) => {
    if (submitting) {
      return;
    }

    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setError("");
    setFeedback("");
  };

  const handleSave = async () => {
    if (submitting) {
      return;
    }

    const validationError = validateOwnerEventTypeForm(form);

    if (validationError) {
      setError(validationError);
      setFeedback("");
      return;
    }

    setSubmitting(true);
    setPendingAction(null);
    setError("");
    setFeedback("");

    try {
      const input = buildOwnerEventTypeInput(form);
      const savedEventType =
        mode === "create"
          ? await onCreateEventType(input)
          : await onUpdateEventType(selectedEventTypeId ?? "", input);

      if (!savedEventType) {
        throw new Error("Не удалось сохранить тип события.");
      }

      setMode("edit");
      setSelectedEventTypeId(savedEventType.id);
      setForm(buildOwnerEventTypeForm(savedEventType));
      setFeedback(mode === "create" ? "Тип события создан." : "Изменения сохранены.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не удалось сохранить тип события.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedEventType || selectedEventType.hasBookings || submitting) {
      return;
    }

    setSubmitting(true);
    setPendingAction(null);
    setError("");
    setFeedback("");

    try {
      const nextEventTypes = await onDeleteEventType(selectedEventType.id);
      const nextSelectedEventType = nextEventTypes[0] ?? null;

      setFeedback("Тип события удален.");

      if (nextSelectedEventType) {
        setMode("edit");
        setSelectedEventTypeId(nextSelectedEventType.id);
        setForm(buildOwnerEventTypeForm(nextSelectedEventType));
      } else {
        setMode("create");
        setSelectedEventTypeId(null);
        setForm(createEmptyOwnerEventTypeForm());
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить тип события.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!selectedEventType || selectedEventType.isArchived || submitting) {
      return;
    }

    setSubmitting(true);
    setPendingAction(null);
    setError("");
    setFeedback("");

    try {
      const archivedEventType = await onArchiveEventType(selectedEventType.id);

      if (!archivedEventType) {
        throw new Error("Не удалось архивировать тип события.");
      }

      setSelectedEventTypeId(archivedEventType.id);
      setForm(buildOwnerEventTypeForm(archivedEventType));
      setFeedback("Тип события переведен в архив.");
    } catch (archiveError) {
      setError(
        archiveError instanceof Error ? archiveError.message : "Не удалось архивировать тип события.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const confirmationDialog =
    pendingAction === "delete"
      ? {
          title: "Удалить тип события?",
          description: "Он исчезнет из owner workspace и будущих вариантов записи.",
          confirmLabel: "Подтвердить удаление",
          confirmClassName: "danger-button",
          onConfirm: handleDeleteConfirm,
        }
      : pendingAction === "archive"
        ? {
            title: "Перевести тип в архив?",
            description: "Он останется видимым в owner списке для истории бронирований.",
            confirmLabel: "Подтвердить архивирование",
            confirmClassName: "secondary-button",
            onConfirm: handleArchiveConfirm,
          }
        : null;

  useEffect(() => {
    if (!confirmationDialog) {
      return;
    }

    cancelActionButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPendingAction(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmationDialog]);

  return (
    <>
      <section className="owner-workspace">
        <header className="owner-hero">
          <div className="hero-header">
            <div>
              <p className="eyebrow">Owner Workspace</p>
              <h1>Управление типами событий</h1>
              <p className="panel-copy owner-hero__copy">
                Настраивайте карточки встреч через backend-источник данных. Изменения сразу
                синхронизируются с owner workspace и публичным списком доступных типов.
              </p>
            </div>
            <OwnerWorkspaceNav
              workspace={workspace}
              onChangeWorkspace={onChangeWorkspace}
              className="workspace-nav--embedded"
            />
          </div>

          <div className="owner-hero__meta">
            <span className="owner-kpi">
              <strong>{eventTypes.length}</strong>
              <span>всего типов</span>
            </span>
            <span className="owner-kpi">
              <strong>{eventTypes.filter((eventType) => eventType.isArchived).length}</strong>
              <span>в архиве</span>
            </span>
          </div>
        </header>

        <div className="owner-layout">
          <section className="owner-card owner-list-panel" aria-labelledby="owner-event-types-title">
            <div className="owner-list-panel__header">
              <div>
                <p className="bookings-card__eyebrow">Список</p>
                <h2 id="owner-event-types-title">Типы событий</h2>
              </div>
              <button type="button" className="secondary-button" onClick={openCreateMode} disabled={submitting}>
                + Создать тип события
              </button>
            </div>

            {loadError ? (
              <div className="owner-empty-state">
                <p className="error-copy" role="alert">
                  {loadError}
                </p>
                {onRetryLoad ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={onRetryLoad}
                    disabled={submitting}
                  >
                    Повторить загрузку
                  </button>
                ) : null}
              </div>
            ) : eventTypes.length === 0 ? (
              <div className="owner-empty-state">
                <p className="owner-empty-state__title">Типов событий пока нет.</p>
                <p className="empty-copy">
                  Создайте первый тип события, чтобы подготовить owner workspace к будущей
                  публикации слотов.
                </p>
                <button type="button" className="primary-button" onClick={openCreateMode} disabled={submitting}>
                  Создать первый тип
                </button>
              </div>
            ) : (
              <ul className="owner-event-type-list" aria-label="Список типов событий">
                {eventTypes.map((eventType) => {
                  const selected = mode === "edit" && selectedEventTypeId === eventType.id;

                  return (
                    <li key={eventType.id}>
                      <button
                        type="button"
                        className={`owner-event-type-card${selected ? " owner-event-type-card--selected" : ""}`}
                        aria-pressed={selected}
                        disabled={submitting}
                        onClick={() => selectEventType(eventType)}
                      >
                        <span className="owner-event-type-card__title">{eventType.title}</span>
                        <span className="owner-event-type-card__meta">
                          {formatDuration(eventType.durationMinutes)}
                        </span>
                        <span className="owner-status-row">
                          {getStatusBadges(eventType).map((status) => (
                            <span
                              key={status}
                              className={`owner-status-pill${status === "Архив" ? " owner-status-pill--archived" : ""}`}
                            >
                              {status}
                            </span>
                          ))}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="owner-card owner-form-panel" aria-labelledby="owner-form-title">
            <div className="owner-form-panel__header">
              <div>
                <p className="bookings-card__eyebrow">Форма</p>
                <h2 id="owner-form-title">
                  {mode === "create" ? "Новый тип события" : "Редактирование типа события"}
                </h2>
              </div>
              {selectedEventType ? (
                <div className="owner-status-row owner-status-row--compact">
                  {getStatusBadges(selectedEventType).map((status) => (
                    <span
                      key={status}
                      className={`owner-status-pill${status === "Архив" ? " owner-status-pill--archived" : ""}`}
                    >
                      {status}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="owner-support-placeholders" aria-label="Будущие статусы синхронизации">
              <p className="owner-support-placeholders__label">Будущая поддержка синхронизации</p>
              <div className="owner-placeholder-alert">Тип был изменен в другой сессии</div>
              <div className="owner-placeholder-alert">Данные устарели, обновите форму</div>
            </div>

            {selectedEventType?.hasBookings ? (
              <p className="owner-rule-banner">
                Тип уже использовался в бронированиях. Его можно только архивировать.
              </p>
            ) : null}

            {selectedEventType?.isArchived ? (
              <p className="owner-archive-banner">
                Этот тип находится в архиве. Форма остается доступной для просмотра и
                редактирования.
              </p>
            ) : null}

            <div className="stack owner-form-fields">
              <label className="field">
                <span>Название</span>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  disabled={submitting}
                  aria-invalid={errorField === "title"}
                  aria-describedby={errorField === "title" ? "owner-event-type-form-error" : undefined}
                  onChange={(event) => handleFieldChange("title", event.target.value)}
                />
              </label>

              <label className="field">
                <span>Описание</span>
                <textarea
                  name="description"
                  rows={4}
                  value={form.description}
                  disabled={submitting}
                  aria-invalid={errorField === "description"}
                  aria-describedby={
                    errorField === "description" ? "owner-event-type-form-error" : undefined
                  }
                  onChange={(event) => handleFieldChange("description", event.target.value)}
                />
              </label>

              <label className="field">
                <span>Длительность</span>
                <input
                  type="number"
                  min="1"
                  step="5"
                  name="durationMinutes"
                  value={form.durationMinutes}
                  disabled={submitting}
                  aria-invalid={errorField === "durationMinutes"}
                  aria-describedby={
                    errorField === "durationMinutes" ? "owner-event-type-form-error" : undefined
                  }
                  onChange={(event) => handleFieldChange("durationMinutes", event.target.value)}
                />
              </label>
            </div>

            {error ? (
              <p
                id="owner-event-type-form-error"
                className="error-copy"
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
              >
                {error}
              </p>
            ) : null}
            {feedback ? (
              <p
                id="owner-event-type-form-feedback"
                className="owner-feedback"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                {feedback}
              </p>
            ) : null}

            <div className="owner-form-actions">
              <button type="button" className="primary-button" onClick={() => void handleSave()} disabled={submitting}>
                {submitting ? "Сохраняем..." : "Сохранить"}
              </button>

              {mode === "edit" && selectedEventType ? (
                <div className="owner-form-actions__secondary">
                  {!selectedEventType.hasBookings ? (
                    <button
                      type="button"
                      className="danger-button"
                      disabled={submitting}
                      onClick={() => setPendingAction("delete")}
                    >
                      Удалить
                    </button>
                  ) : !selectedEventType.isArchived ? (
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={submitting}
                      onClick={() => setPendingAction("archive")}
                    >
                      Архивировать
                    </button>
                  ) : (
                    <p className="empty-copy">
                      Архивный тип остается в списке и недоступен для удаления.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </section>

      {confirmationDialog ? (
        <div
          className="owner-dialog-backdrop"
          onClick={() => setPendingAction(null)}
        >
          <div
            className="owner-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="owner-confirmation-title"
            aria-describedby="owner-confirmation-description"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="owner-dialog__eyebrow">Подтверждение действия</p>
            <h3 id="owner-confirmation-title">{confirmationDialog.title}</h3>
            <p id="owner-confirmation-description">{confirmationDialog.description}</p>
            <div className="owner-dialog__actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setPendingAction(null)}
                disabled={submitting}
                ref={cancelActionButtonRef}
              >
                Отмена
              </button>
              <button
                type="button"
                className={confirmationDialog.confirmClassName}
                onClick={() => void confirmationDialog.onConfirm()}
                disabled={submitting}
              >
                {confirmationDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
