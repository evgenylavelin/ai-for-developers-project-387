type SuccessStateProps = {
  onRestart: () => void;
  summary: string;
};

export function SuccessState({ onRestart, summary }: SuccessStateProps) {
  return (
    <section className="panel">
      <p className="eyebrow">Call Planner</p>
      <h1>Бронирование подтверждено</h1>
      <p className="panel-copy">Детали встречи сохранены.</p>
      <p className="selection-summary selection-summary--success">{summary}</p>
      <div className="actions">
        <span />
        <button type="button" className="primary-button" onClick={onRestart}>
          Вернуться в начало
        </button>
      </div>
    </section>
  );
}
