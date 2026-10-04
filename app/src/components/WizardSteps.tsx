export function WizardSteps({ labels, step, onStep, canVisit }: { labels: string[]; step: number; onStep?: (step: number) => void; canVisit?: (step: number) => boolean }) {
  return <ol className="wizard-steps" aria-label="Étapes">{labels.map((label, index) => <li key={label} className={index === step ? 'current' : index < step ? 'complete' : ''} aria-current={index === step ? 'step' : undefined}><button disabled={!onStep || (canVisit ? !canVisit(index) : index >= step)} onClick={() => onStep?.(index)}><span>{index < step ? '✓' : index + 1}</span>{label}</button></li>)}</ol>;
}
