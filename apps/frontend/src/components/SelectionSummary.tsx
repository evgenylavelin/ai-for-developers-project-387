type SelectionSummaryProps = {
  values: string[];
};

export function SelectionSummary({ values }: SelectionSummaryProps) {
  if (values.length === 0) {
    return null;
  }

  return (
    <div className="selection-summary" aria-label="Результат предыдущих шагов">
      {values.map((value) => (
        <span key={value} className="selection-summary__chip">
          {value}
        </span>
      ))}
    </div>
  );
}
