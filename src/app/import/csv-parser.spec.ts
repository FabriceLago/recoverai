import { describe, expect, it } from 'vitest';
import { parseCsv } from './csv-parser';

describe('parseCsv', () => {
  it('parses simple comma-separated rows', () => {
    expect(parseCsv('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('keeps a comma inside a quoted field intact', () => {
    expect(parseCsv('company_name,title\n"Acme, Inc.",Website revamp')).toEqual([
      ['company_name', 'title'],
      ['Acme, Inc.', 'Website revamp'],
    ]);
  });

  it('unescapes doubled quotes inside a quoted field', () => {
    expect(parseCsv('name\n"Say ""hi"" now"')).toEqual([['name'], ['Say "hi" now']]);
  });

  it('handles CRLF line endings', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('handles a newline embedded in a quoted field', () => {
    expect(parseCsv('name\n"line one\nline two"')).toEqual([['name'], ['line one\nline two']]);
  });

  it('returns an empty array for empty input', () => {
    expect(parseCsv('')).toEqual([]);
  });
});
