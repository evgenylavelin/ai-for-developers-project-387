type SuccessStateProps = {
  summary: string;
};

export function SuccessState({ summary }: SuccessStateProps) {
  return (
    <section className="panel">
      <p className="eyebrow">Call Planner</p>
      <h1>Бронирование подтверждено</h1>
      <p className="panel-copy">Детали встречи сохранены. Мы отправим подтверждение на указанный email.</p>
      <p className="selection-summary selection-summary--success">{summary}</p>
    </section>
  );
}
