type SuccessStateProps = {
  actionLabel?: string;
  guestEmail?: string;
  onAction: () => void;
  summary: string;
};

export function SuccessState({
  actionLabel = "Вернуться в начало",
  guestEmail,
  onAction,
  summary,
}: SuccessStateProps) {
  return (
    <section className="panel">
      <p className="eyebrow">Call Planner</p>
      <h1>Бронирование подтверждено</h1>
      <p className="panel-copy">Детали встречи сохранены.</p>
      {guestEmail ? <p className="panel-copy">{guestEmail}</p> : null}
      <p className="selection-summary selection-summary--success">{summary}</p>
      <div className="actions">
        <span />
        <button type="button" className="primary-button" onClick={onAction}>
          {actionLabel}
        </button>
      </div>
    </section>
  );
}
