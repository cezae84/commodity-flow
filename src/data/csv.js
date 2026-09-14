/**
 * Minimal RFC 4180 CSV reader/writer, shared by the app and the node scripts.
 *
 * The data files are edited in spreadsheets, so the reader tolerates what
 * spreadsheets produce: a UTF-8 byte-order mark, CRLF line endings, quoted
 * fields containing commas, quotes ("") or line breaks, and trailing blank rows.
 */

/** Parses CSV text into an array of objects keyed by the header row. */
export function parseCsv(text) {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...body] = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (!header) return [];
  const keys = header.map((h) => h.trim());
  return body.map((r) =>
    Object.fromEntries(keys.map((k, idx) => [k, (r[idx] ?? '').trim()]))
  );
}

/** Serialises objects to CSV with the given column order. */
export function toCsv(rows, columns) {
  const cell = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(','), ...rows.map((r) => columns.map((c) => cell(r[c])).join(','))].join(
    '\n'
  );
}

/** Splits a `a|b|c` list cell. */
export const splitList = (cell) =>
  (cell ?? '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
