import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { OpportunityForm } from './opportunity-form';
import { OpportunitiesService } from './opportunities.service';
import { OrganizationService } from '../core/organization.service';
import type { OpportunityFormValue } from './opportunity.model';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { I18nService } from '../core/i18n/i18n.service';

@Component({
  selector: 'app-opportunity-new-page',
  imports: [OpportunityForm, TranslatePipe],
  templateUrl: './opportunity-new-page.html',
  styleUrls: ['./opportunities-page.scss'],
})
export class OpportunityNewPage {
  private readonly i18n = inject(I18nService);
  private readonly opportunities = inject(OpportunitiesService);
  private readonly organization = inject(OrganizationService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly error = signal('');

  async onSave(value: OpportunityFormValue) {
    const organizationId = this.organization.organizationId();
    if (!organizationId) {
      this.error.set(this.i18n.t('No organization found for your account yet.'));
      return;
    }

    this.submitting.set(true);
    this.error.set('');
    try {
      const created = await this.opportunities.create(organizationId, value);
      this.router.navigate(['/opportunities', created.id]);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : this.i18n.t('Failed to create opportunity.'));
    } finally {
      this.submitting.set(false);
    }
  }
}
