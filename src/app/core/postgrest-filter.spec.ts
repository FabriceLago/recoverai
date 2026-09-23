import { describe, expect, it } from 'vitest';
import { MAX_SEARCH_LENGTH, buildContainsFilter } from './postgrest-filter';

// Counts top-level conditions: commas inside double quotes do not separate them.
function topLevelConditions(expression: string): number {
  let inQuotes = false;
  let count = 1;
  const BS = String.fromCharCode(92);
  for (let i = 0; i < expression.length; i++) {
    const char = expression[i];
    if (char === BS) i++;
    else if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) count++;
  }
  return count;
}

describe('buildContainsFilter', () => {
  const columns = ['company_name', 'title'];

  it('builds one condition per column for a normal term', () => {
    const filter = buildContainsFilter(columns, 'acme');
    expect(filter).toBe('company_name.ilike."%acme%",title.ilike."%acme%"');
    expect(topLevelConditions(filter)).toBe(2);
  });

  it('cannot be used to append extra conditions', () => {
    const filter = buildContainsFilter(columns, 'zzzz,id.not.is.null,title.ilike.');
    expect(topLevelConditions(filter)).toBe(2);
  });

  it('keeps parentheses and dots inside the quoted value', () => {
    const filter = buildContainsFilter(columns, 'a),(b.c');
    expect(topLevelConditions(filter)).toBe(2);
    expect(filter).toContain('"%a),(b.c%"');
  });

  it('cannot break out of the quotes', () => {
    const filter = buildContainsFilter(columns, 'x" ,id.not.is.null,y.eq."');
    expect(topLevelConditions(filter)).toBe(2);
  });

  it('treats LIKE wildcards as literal characters', () => {
    const BS = String.fromCharCode(92);
    const filter = buildContainsFilter(columns, '50%_off');
    expect(filter).toContain(BS + BS + '%');
    expect(filter).toContain(BS + BS + '_');
  });

  it('caps the length of the search term', () => {
    const filter = buildContainsFilter(columns, 'a'.repeat(5000));
    expect(filter.length).toBeLessThan(MAX_SEARCH_LENGTH * 4);
  });
});
