// User text must never be concatenated raw into a PostgREST filter: a comma or
// parenthesis lets the user append their own conditions (e.g. "x,id.not.is.null").
// The value is LIKE-escaped, then wrapped in double quotes so PostgREST treats it as
// one literal. Backslashes are built with fromCharCode to avoid escaping mistakes.
const BS = String.fromCharCode(92);

function escapeLike(text: string): string {
  return text
    .split(BS).join(BS + BS)
    .split('%').join(BS + '%')
    .split('_').join(BS + '_');
}

function quote(text: string): string {
  return '"' + text.split(BS).join(BS + BS).split('"').join(BS + '"') + '"';
}

export const MAX_SEARCH_LENGTH = 100;

/** `or=` expression matching `term` (case-insensitive substring) in any of `columns`. */
export function buildContainsFilter(columns: string[], term: string): string {
  const pattern = '%' + escapeLike(term.trim().slice(0, MAX_SEARCH_LENGTH)) + '%';
  const value = quote(pattern);
  return columns.map((column) => `${column}.ilike.${value}`).join(',');
}
