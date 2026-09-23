import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { parseCsv } from './csv-parser';
import { CsvImportService } from './csv-import.service';
import { OrganizationService } from '../core/organization.service';
import type { ColumnMapping, ValidatedRow } from './csv-import.model';

type Step = 'upload' | 'preview' | 'done';

@Component({
  selector: 'app-import-page',
  imports: [RouterLink],
  templateUrl: './import-page.html',
  styleUrl: './import-page.scss',
})
export class ImportPage {
  private readonly csvImport = inject(CsvImportService);
  private readonly organization = inject(OrganizationService);

  readonly step = signal<Step>('upload');
  readonly rows = signal<ValidatedRow[]>([]);
  readonly error = signal('');
  readonly importing = signal(false);
  readonly importedCount = signal(0);

  readonly validCount = computed(() => this.rows().filter((r) => r.value !== null).length);
  readonly invalidCount = computed(() => this.rows().filter((r) => r.value === null).length);

  async onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.error.set('');

    try {
      const text = await file.text();
      const table = parseCsv(text);
      if (table.length === 0) {
        this.error.set('The file is empty.');
        return;
      }

      const [headerRow, ...dataRows] = table;
      const mapping: ColumnMapping = this.csvImport.detectMapping(headerRow);
      if (mapping.company_name === undefined || mapping.title === undefined) {
        this.error.set('CSV must include at least company_name and title columns.');
        return;
      }

      const validated = dataRows
        .filter((row) => row.some((cell) => cell.trim() !== ''))
        .map((row, index) => this.csvImport.validateRow(row, mapping, index + 2));

      this.rows.set(validated);
      this.step.set('preview');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to read the file.');
    }
  }

  async onImport() {
    const organizationId = this.organization.organizationId();
    if (!organizationId) {
      this.error.set('No organization found for your account yet.');
      return;
    }
    const validRows = this.rows()
      .map((r) => r.value)
      .filter((v): v is NonNullable<typeof v> => v !== null);

    this.importing.set(true);
    this.error.set('');
    try {
      const count = await this.csvImport.importRows(organizationId, validRows);
      this.importedCount.set(count);
      this.step.set('done');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to import opportunities.');
    } finally {
      this.importing.set(false);
    }
  }

  reset() {
    this.step.set('upload');
    this.rows.set([]);
    this.error.set('');
  }

  formatCurrency(value: number, currency: string) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  }
}
