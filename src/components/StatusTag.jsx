import { STATUS } from '../data/commodities.js';

/**
 * The current status as a terminal field: [ ✕ Halted ]. Icon and label always
 * travel together — the colour is only a reinforcement.
 */
export default function StatusTag({ status, long = false }) {
  const s = STATUS[status];
  if (!s) return null;
  return (
    <span
      className={`statustag statustag--${status}`}
      style={{ '--status-color': s.color }}
      title={`Now: ${s.label}`}
    >
      <span aria-hidden="true">{s.icon}</span> {long ? s.label : s.short}
    </span>
  );
}
