import { Injectable } from '@angular/core';
import { supabase } from '../core/supabase.client';
import { OPPORTUNITY_STATUSES } from '../opportunities/opportunity.model';
import { IMPORT_FIELDS, type ColumnMapping, type ImportField, type ImportRowValue, type ValidatedRow } from './csv-import.model';

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

@Injectable({ providedIn: 'root' })
export class CsvImportService {
  detectMapping(headers: string[]): ColumnMapping {
    const mapping: ColumnMapping = {};
    const normalized = headers.map(normalizeHeader);
    for (const field of IMPORT_FIELDS) {
      const index = normalized.indexOf(field);
      if (index !== -1) mapping[field] = index;
    }
    return mapping;
  }

  private cell(cells: string[], mapping: ColumnMapping, field: ImportField): string {
    const index = mapping[field];
    if (index === undefined || index >= cells.length) return '';
    return cells[index].trim();
  }

  validateRow(cells: string[], mapping: ColumnMapping, rowNumber: number): ValidatedRow {
    const errors: string[] = [];

    const company_name = this.cell(cells, mapping, 'company_name');
    const title = this.cell(cells, mapping, 'title');
    if (!company_name) errors.push('company_name is required');
    if (!title) errors.push('title is required');

    const rawValue = this.cell(cells, mapping, 'value');
    let value = 0;
    if (rawValue) {
      value = Number(rawValue);
      if (!Number.isFinite(value) || value < 0) errors.push(`value "${rawValue}" is not a valid non-negative number`);
    }

    const rawCurrency = this.cell(cells, mapping, 'currency');
    const currency = rawCurrency ? rawCurrency.toUpperCase() : 'EUR';

    const rawStatus = this.cell(cells, mapping, 'status');
    const status = rawStatus || 'NEW';
    if (!OPPORTUNITY_STATUSES.includes(status as (typeof OPPORTUNITY_STATUSES)[number])) {
      errors.push(`status "${rawStatus}" is not one of ${OPPORTUNITY_STATUSES.join(', ')}`);
    }

    const parseDate = (field: ImportField, label: string): string | null => {
      const raw = this.cell(cells, mapping, field);
      if (!raw) return null;
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) {
        errors.push(`${label} "${raw}" is not a valid date`);
        return null;
      }
      return date.toISOString();
    };

    const created_at = parseDate('created_at', 'created_at');
    const last_contact_at = parseDate('last_contact_at', 'last_contact_at');
    const expected_close_date_raw = this.cell(cells, mapping, 'expected_close_date');
    let expected_close_date: string | null = null;
    if (expected_close_date_raw) {
      const date = new Date(expected_close_date_raw);
      if (Number.isNaN(date.getTime())) {
        errors.push(`expected_close_date "${expected_close_date_raw}" is not a valid date`);
      } else {
        expected_close_date = date.toISOString().slice(0, 10);
      }
    }

    const parseCount = (field: ImportField, label: string): number => {
      const raw = this.cell(cells, mapping, field);
      if (!raw) return 0;
      const parsed = Number(raw);
      if (!Number.isInteger(parsed) || parsed < 0) {
        errors.push(`${label} "${raw}" is not a valid non-negative integer`);
        return 0;
      }
      return parsed;
    };

    const email_count = parseCount('email_count', 'email_count');
    const reply_count = parseCount('reply_count', 'reply_count');

    const contact_email = this.cell(cells, mapping, 'contact_email') || null;
    if (contact_email && !contact_email.includes('@')) {
      errors.push(`contact_email "${contact_email}" does not look like an email address`);
    }

    if (errors.length > 0) {
      return { rowNumber, raw: cells, errors, value: null };
    }

    const rowValue: ImportRowValue = {
      company_name,
      title,
      contact_name: this.cell(cells, mapping, 'contact_name') || null,
      contact_email,
      description: null,
      value,
      currency,
      status: status as ImportRowValue['status'],
      expected_close_date,
      created_at,
      last_contact_at,
      email_count,
      reply_count,
    };

    return { rowNumber, raw: cells, errors: [], value: rowValue };
  }

  async importRows(organizationId: string, rows: ImportRowValue[]): Promise<number> {
    if (rows.length === 0) return 0;
    const payload = rows.map((row) => ({ ...row, organization_id: organizationId }));
    const { error, count } = await supabase.from('opportunities').insert(payload, { count: 'exact' });
    if (error) throw error;
    return count ?? rows.length;
  }
}
