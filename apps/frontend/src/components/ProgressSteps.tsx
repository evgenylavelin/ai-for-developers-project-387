type ProgressStepsProps = {
  steps: string[];
  activeIndex: number;
};

export function ProgressSteps({ steps, activeIndex }: ProgressStepsProps) {
  return (
    <ol className="progress-steps" aria-label="Прогресс бронирования">
      {steps.map((step, index) => {
        const state =
          index < activeIndex ? "done" : index === activeIndex ? "active" : "upcoming";

        return (
          <li key={step} className={`progress-step progress-step--${state}`}>
            <span className="progress-step__index">{index + 1}</span>
            <span className="progress-step__label">{step}</span>
          </li>
        );
      })}
    </ol>
  );
}
