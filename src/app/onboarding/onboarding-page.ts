import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { supabase } from '../core/supabase.client';
import { SimulationService } from '../import/simulation.service';
import { OrganizationService } from '../core/organization.service';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { LanguageSwitcher } from '../core/i18n/language-switcher';

type Start = 'simulation' | 'csv' | 'empty';

// ponytail: only the company name is persisted (no schema for industry / monthly
// volume / average deal value from §11). Add those columns when something uses them.
@Component({
  selector: 'app-onboarding-page',
  imports: [ReactiveFormsModule, TranslatePipe, LanguageSwitcher],
  templateUrl: './onboarding-page.html',
  styleUrls: ['../auth/auth-card.scss', './onboarding-page.scss'],
})
export class OnboardingPage {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly simulation = inject(SimulationService);
  private readonly organization = inject(OrganizationService);

  readonly options: { value: Start; label: string; hint: string }[] = [
    { value: 'simulation', label: 'Simulation mode', hint: 'Explore with ~20 realistic demo opportunities.' },
    { value: 'csv', label: 'Import a CSV', hint: 'Bring your own pipeline.' },
    { value: 'empty', label: 'Start empty', hint: 'Add opportunities manually.' },
  ];

  readonly submitting = signal(false);
  readonly errorMessage = signal('');

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    start: ['simulation' as Start],
  });

  async submit() {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.errorMessage.set('');
    const { name, start } = this.form.getRawValue();

    try {
      const { data, error } = await supabase.rpc('create_organization_with_owner', { org_name: name });
      if (error) throw error;
      const organizationId = (data as { id: string }).id;
      await this.organization.refresh();

      if (start === 'simulation') {
        await this.simulation.activate(organizationId);
        await this.router.navigateByUrl('/dashboard');
      } else if (start === 'csv') {
        await this.router.navigateByUrl('/import');
      } else {
        await this.router.navigateByUrl('/dashboard');
      }
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : this.i18n.t('Could not create your workspace.'));
    } finally {
      this.submitting.set(false);
    }
  }
}
