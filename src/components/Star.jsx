/**
 * Watchlist toggle. The filled/empty glyph and the accessible label carry the
 * state — never colour alone.
 */
export default function Star({ active, onToggle, label, className = '' }) {
  return (
    <button
      type="button"
      className={`star${active ? ' is-active' : ''} ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={active}
      aria-label={active ? `Remove ${label} from watchlist` : `Add ${label} to watchlist`}
      title={active ? 'Remove from watchlist' : 'Add to watchlist'}
    >
      {active ? '★' : '☆'}
    </button>
  );
}
