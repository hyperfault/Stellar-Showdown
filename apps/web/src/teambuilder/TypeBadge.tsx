import { typeColor } from '../typeColors';

export function TypeBadge({ type, small }: { type: string; small?: boolean }) {
  return <span className={`tbadge${small ? ' tbadge--sm' : ''}`} style={{ background: typeColor(type) }}>{type}</span>;
}
