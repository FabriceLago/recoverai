import type { OpportunityFormValue } from '../opportunities/opportunity.model';

export const IMPORT_FIELDS = [
  'company_name',
  'contact_name',
  'contact_email',
  'title',
  'value',
  'currency',
  'status',
  'created_at',
  'last_contact_at',
  'expected_close_date',
  'email_count',
  'reply_count',
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number];

export type ColumnMapping = Partial<Record<ImportField, number>>;

export interface ImportRowValue extends OpportunityFormValue {
  created_at: string | null;
  last_contact_at: string | null;
  email_count: number;
  reply_count: number;
}

export interface ValidatedRow {
  rowNumber: number;
  raw: string[];
  errors: string[];
  value: ImportRowValue | null;
}
