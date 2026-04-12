import { useEffect, useRef, useState } from "react";

import {
  archiveOwnerEventType,
  buildOwnerEventTypeForm,
  createEmptyOwnerEventTypeForm,
  deleteOwnerEventType,
  saveOwnerEventType,
  validateOwnerEventTypeForm,
} from "../lib/ownerEventTypes";
import type { OwnerEventType, OwnerEventTypeForm } from "../types";

type OwnerEventTypesPageProps = {
  initialEventTypes: OwnerEventType[];
  workspace: "public" | "owner";
  onChangeWorkspace: (workspace: "public" | "owner") => void;
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
  initialEventTypes,
  workspace,
  onChangeWorkspace,
}: OwnerEventTypesPageProps) {
  const [eventTypes, setEventTypes] = useState(initialEventTypes);
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<string | null>(
    initialEventTypes[0]?.id ?? null,
  );
  const [form, setForm] = useState<OwnerEventTypeForm>(
    initialEventTypes[0]
      ? buildOwnerEventTypeForm(initialEventTypes[0])
      : createEmptyOwnerEventTypeForm(),
  );
  const [mode, setMode] = useState<"create" | "edit">(initialEventTypes[0] ? "edit" : "create");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const cancelActionButtonRef = useRef<HTMLButtonElement | null>(null);
  const errorField = getValidationErrorField(error);

  useEffect(() => {
    setEventTypes(initialEventTypes);
    setSelectedEventTypeId(initialEventTypes[0]?.id ?? null);
    setForm(
      initialEventTypes[0]
        ? buildOwnerEventTypeForm(initialEventTypes[0])
        : createEmptyOwnerEventTypeForm(),
    );
    setMode(initialEventTypes[0] ? "edit" : "create");
    setError("");
    setFeedback("");
    setPendingAction(null);
  }, [initialEventTypes]);

  const selectedEventType =
    mode === "edit" ? eventTypes.find((eventType) => eventType.id === selectedEventTypeId) ?? null : null;

  const openCreateMode = () => {
    setMode("create");
    setSelectedEventTypeId(null);
    setForm(createEmptyOwnerEventTypeForm());
    setError("");
    setFeedback("");
    setPendingAction(null);
  };

  const selectEventType = (eventType: OwnerEventType) => {
    setMode("edit");
    setSelectedEventTypeId(eventType.id);
    setForm(buildOwnerEventTypeForm(eventType));
    setError("");
    setFeedback("");
    setPendingAction(null);
  };

  const handleFieldChange = (field: keyof OwnerEventTypeForm, value: string) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setError("");
    setFeedback("");
  };

  const handleSave = () => {
    const validationError = validateOwnerEventTypeForm(form);

    if (validationError) {
      setError(validationError);
      setFeedback("");
      return;
    }

    const result = saveOwnerEventType(eventTypes, form, mode === "edit" ? selectedEventTypeId : null);
    const nextSelectedEventType =
      result.eventTypes.find((eventType) => eventType.id === result.selectedEventTypeId) ?? null;

    setEventTypes(result.eventTypes);
    setMode("edit");
    setSelectedEventTypeId(result.selectedEventTypeId);
    setForm(
      nextSelectedEventType
        ? buildOwnerEventTypeForm(nextSelectedEventType)
        : createEmptyOwnerEventTypeForm(),
    );
    setPendingAction(null);
    setError("");
    setFeedback(
      mode === "create"
        ? "Новый тип события добавлен в локальный список."
        : "Изменения сохранены в локальном mock-состоянии.",
    );
  };

  const handleDeleteConfirm = () => {
    if (!selectedEventType || selectedEventType.hasBookings) {
      return;
    }

    const nextEventTypes = deleteOwnerEventType(eventTypes, selectedEventType.id);
    const nextSelectedEventType = nextEventTypes[0] ?? null;

    setEventTypes(nextEventTypes);
    setPendingAction(null);
    setError("");
    setFeedback("Тип события удален из локального списка.");

    if (nextSelectedEventType) {
      setMode("edit");
      setSelectedEventTypeId(nextSelectedEventType.id);
      setForm(buildOwnerEventTypeForm(nextSelectedEventType));
      return;
    }

    setMode("create");
    setSelectedEventTypeId(null);
    setForm(createEmptyOwnerEventTypeForm());
  };

  const handleArchiveConfirm = () => {
    if (!selectedEventType || selectedEventType.isArchived) {
      return;
    }

    const nextEventTypes = archiveOwnerEventType(eventTypes, selectedEventType.id);
    const nextSelectedEventType =
      nextEventTypes.find((eventType) => eventType.id === selectedEventType.id) ?? null;

    setEventTypes(nextEventTypes);
    setPendingAction(null);
    setError("");
    setFeedback("Тип события переведен в архив в локальном mock-состоянии.");

    if (nextSelectedEventType) {
      setForm(buildOwnerEventTypeForm(nextSelectedEventType));
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
                Локальная административная зона для настройки карточек встреч. В этой версии CRUD
                работает только в mock-состоянии внутри frontend-приложения.
              </p>
            </div>

            <nav className="workspace-nav workspace-nav--embedded" aria-label="Разделы приложения">
              <button
                type="button"
                className={`workspace-nav__link${workspace === "public" ? " workspace-nav__link--active" : ""}`}
                aria-pressed={workspace === "public"}
                onClick={() => onChangeWorkspace("public")}
              >
                Бронирования
              </button>
              <button
                type="button"
                className={`workspace-nav__link${workspace === "owner" ? " workspace-nav__link--active" : ""}`}
                aria-pressed={workspace === "owner"}
                onClick={() => onChangeWorkspace("owner")}
              >
                Типы событий
              </button>
            </nav>
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
              <button type="button" className="secondary-button" onClick={openCreateMode}>
                + Создать тип события
              </button>
            </div>

            {eventTypes.length === 0 ? (
              <div className="owner-empty-state">
                <p className="owner-empty-state__title">Типов событий пока нет.</p>
                <p className="empty-copy">
                  Создайте первый тип события, чтобы подготовить owner workspace к будущей
                  публикации слотов.
                </p>
                <button type="button" className="primary-button" onClick={openCreateMode}>
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
                Этот тип находится в архиве. Форма остается доступной для просмотра и локального
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
              <button type="button" className="primary-button" onClick={handleSave}>
                Сохранить
              </button>

              {mode === "edit" && selectedEventType ? (
                <div className="owner-form-actions__secondary">
                  {!selectedEventType.hasBookings ? (
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => setPendingAction("delete")}
                    >
                      Удалить
                    </button>
                  ) : !selectedEventType.isArchived ? (
                    <button
                      type="button"
                      className="secondary-button"
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
                ref={cancelActionButtonRef}
              >
                Отмена
              </button>
              <button
                type="button"
                className={confirmationDialog.confirmClassName}
                onClick={confirmationDialog.onConfirm}
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
