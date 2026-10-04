import type { ReactNode } from 'react';

/** The same compact element presentation is used in jingles and ordinary parts. */
export function SectionElementCard({ icon, title, detail, className = '', included, onInclude, onEdit, editLabel = 'Modifier', onDelete, children }: {
  icon: string; title: string; detail: string; className?: string; included?: boolean;
  onInclude?: (included: boolean) => void; onEdit: () => void; editLabel?: string; onDelete?: () => void; children?: ReactNode;
}) {
  return <article className={`section-element-card ${className} ${included === false ? 'excluded' : ''}`}>
    <span className="block-icon" aria-hidden="true">{icon}</span>
    <div className="block-info"><div className="element-title-row">{onInclude && <input type="checkbox" aria-label={`Inclure ${title.toLocaleLowerCase('fr')} dans le jingle`} checked={included !== false} onChange={event => onInclude(event.target.checked)} />}<strong>{title}</strong></div><small>{included === false ? 'Non inclus · ' : ''}{detail}</small></div>
    <div className="element-card-actions"><button className="jingle-part-edit" onClick={onEdit}>✎ {editLabel}</button>{onDelete && <button className="jingle-part-edit danger-text" onClick={onDelete}>× Supprimer</button>}</div>
    {children && <div className="element-card-preview">{children}</div>}
  </article>;
}
