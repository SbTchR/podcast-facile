export function WizardSteps({ labels, step, onStep }: { labels: string[]; step: number; onStep?: (step: number) => void }) {
  return <ol className="wizard-steps" aria-label="Étapes">{labels.map((label, index) => <li key={label} className={index === step ? 'current' : index < step ? 'complete' : ''} aria-current={index === step ? 'step' : undefined}><button disabled={!onStep || index >= step} onClick={() => onStep?.(index)}><span>{index < step ? '✓' : index + 1}</span>{label}</button></li>)}</ol>;
}
