import { Icon } from './Icon';

/** Floating matchmaking indicator — visible app-wide while a ladder search is running. */
export function SearchPill({ formats, onCancel }: { formats: string[]; onCancel: () => void }) {
  return (
    <div className="search-pill" role="status">
      <span className="search-pill__dot" aria-hidden="true" />
      <span>Searching for a battle{formats.length > 0 ? ` (${formats.join(', ')})` : ''}…</span>
      <button className="search-pill__cancel" aria-label="Cancel search" onClick={onCancel}>
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}
