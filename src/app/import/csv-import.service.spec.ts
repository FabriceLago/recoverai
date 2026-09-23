import { describe, expect, it } from 'vitest';
import { CsvImportService } from './csv-import.service';
import type { ColumnMapping } from './csv-import.model';

describe('CsvImportService', () => {
  const service = new CsvImportService();

  const mapping: ColumnMapping = {
    company_name: 0,
    title: 1,
    value: 2,
    status: 3,
    expected_close_date: 4,
  };

  it('detects a standard header mapping', () => {
    const headers = ['company_name', 'Title', 'Value', 'Expected Close Date'];
    expect(service.detectMapping(headers)).toEqual({
      company_name: 0,
      title: 1,
      value: 2,
      expected_close_date: 3,
    });
  });

  it('accepts a fully valid row', () => {
    const result = service.validateRow(['Acme', 'Website revamp', '7500', 'NEW', '2026-12-01'], mapping, 2);
    expect(result.errors).toEqual([]);
    expect(result.value).toMatchObject({
      company_name: 'Acme',
      title: 'Website revamp',
      value: 7500,
      status: 'NEW',
      expected_close_date: '2026-12-01',
    });
  });

  it('flags missing required fields', () => {
    const result = service.validateRow(['', '', '', '', ''], mapping, 3);
    expect(result.errors).toContain('company_name is required');
    expect(result.errors).toContain('title is required');
    expect(result.value).toBeNull();
  });

  it('flags an invalid status', () => {
    const result = service.validateRow(['Acme', 'Deal', '100', 'NOT_A_STATUS', ''], mapping, 4);
    expect(result.errors.some((e) => e.includes('status'))).toBe(true);
  });

  it('flags a non-numeric value', () => {
    const result = service.validateRow(['Acme', 'Deal', 'not-a-number', 'NEW', ''], mapping, 5);
    expect(result.errors.some((e) => e.includes('value'))).toBe(true);
  });

  it('flags an invalid date', () => {
    const result = service.validateRow(['Acme', 'Deal', '100', 'NEW', 'not-a-date'], mapping, 6);
    expect(result.errors.some((e) => e.includes('expected_close_date'))).toBe(true);
  });

  it('defaults status to NEW and currency to EUR when blank', () => {
    const minimalMapping: ColumnMapping = { company_name: 0, title: 1 };
    const result = service.validateRow(['Acme', 'Deal'], minimalMapping, 7);
    expect(result.value?.status).toBe('NEW');
    expect(result.value?.currency).toBe('EUR');
  });
});
