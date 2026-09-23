import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { OPPORTUNITY_STATUSES, type OpportunityFormValue } from './opportunity.model';

@Component({
  selector: 'app-opportunity-form',
  imports: [ReactiveFormsModule],
  templateUrl: './opportunity-form.html',
  styleUrl: './opportunity-form.scss',
})
export class OpportunityForm {
  private readonly fb = inject(FormBuilder);

  readonly initialValue = input<OpportunityFormValue | null>(null);
  readonly submitLabel = input('Create opportunity');
  readonly submitting = input(false);
  readonly error = input('');
  readonly save = output<OpportunityFormValue>();

  readonly statuses = OPPORTUNITY_STATUSES;

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    company_name: ['', [Validators.required]],
    contact_name: [''],
    contact_email: ['', [Validators.email]],
    value: [0, [Validators.required, Validators.min(0)]],
    currency: ['EUR', [Validators.required]],
    status: ['NEW' as OpportunityFormValue['status'], [Validators.required]],
    expected_close_date: [''],
    description: [''],
  });

  constructor() {
    effect(() => {
      const value = this.initialValue();
      if (value) {
        this.form.patchValue({
          ...value,
          contact_name: value.contact_name ?? '',
          contact_email: value.contact_email ?? '',
          expected_close_date: value.expected_close_date ?? '',
          description: value.description ?? '',
        });
      }
    });
  }

  onSubmit() {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    this.save.emit({
      ...raw,
      contact_name: raw.contact_name || null,
      contact_email: raw.contact_email || null,
      expected_close_date: raw.expected_close_date || null,
      description: raw.description || null,
    });
  }
}
