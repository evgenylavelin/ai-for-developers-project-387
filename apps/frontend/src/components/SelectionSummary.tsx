type SelectionSummaryProps = {
  value?: string;
};

export function SelectionSummary({ value }: SelectionSummaryProps) {
  if (!value) {
    return null;
  }

  return <p className="selection-summary">{value}</p>;
}
