import { Component, inject, signal } from '@angular/core';
import { SimulationService } from '../import/simulation.service';
import { OrganizationService } from '../core/organization.service';
import { EmailProviderRegistry } from '../integrations/email-provider.registry';
import type { EmailProviderName } from '../integrations/email-provider.model';
import { BillingService } from '../billing/billing.service';
import { ToastService } from '../core/toast.service';
import type { PlanId } from '../billing/billing.model';

type RealProvider = { name: Exclude<EmailProviderName, 'MOCK'>; label: string };

@Component({
  selector: 'app-settings-page',
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
})
export class SettingsPage {
  private readonly simulation = inject(SimulationService);
  private readonly organization = inject(OrganizationService);
  private readonly providers = inject(EmailProviderRegistry);
  private readonly billing = inject(BillingService);
  private readonly toast = inject(ToastService);

  readonly plans = this.billing.getPlans();
  readonly billingMessage = signal('');

  readonly realProviders: RealProvider[] = [
    { name: 'GMAIL', label: 'Gmail' },
    { name: 'OUTLOOK', label: 'Outlook' },
  ];

  readonly activating = signal(false);
  readonly error = signal('');
  readonly successMessage = signal('');
  readonly integrationMessage = signal('');
  readonly statuses = signal<Record<string, 'CONNECTED' | 'DISCONNECTED'>>({});

  constructor() {
    this.loadStatuses();
  }

  private async loadStatuses() {
    const organizationId = this.organization.organizationId();
    if (!organizationId) return;
    const entries = await Promise.all(
      this.realProviders.map(async ({ name }) => {
        try {
          const connected = await this.providers.get(name).isConnected(organizationId);
          return [name, connected ? 'CONNECTED' : 'DISCONNECTED'] as const;
        } catch {
          return [name, 'DISCONNECTED'] as const;
        }
      }),
    );
    this.statuses.set(Object.fromEntries(entries));
  }

  async onConnect(name: RealProvider['name']) {
    const organizationId = this.organization.organizationId();
    if (!organizationId) {
      this.integrationMessage.set('No organization found for your account yet.');
      return;
    }
    this.integrationMessage.set('');
    try {
      await this.providers.get(name).connect(organizationId);
      await this.loadStatuses();
    } catch (err) {
      this.integrationMessage.set(err instanceof Error ? err.message : 'Failed to connect.');
    }
  }

  async onSubscribe(planId: PlanId) {
    this.billingMessage.set('');
    try {
      window.location.href = await this.billing.startCheckout(planId);
    } catch (err) {
      this.billingMessage.set(err instanceof Error ? err.message : 'Failed to start checkout.');
    }
  }

  async onActivate() {
    const organizationId = this.organization.organizationId();
    if (!organizationId) {
      this.error.set('No organization found for your account yet.');
      return;
    }
    this.activating.set(true);
    this.error.set('');
    this.successMessage.set('');
    try {
      const count = await this.simulation.activate(organizationId);
      this.successMessage.set(`Created ${count} simulated opportunities.`);
      this.toast.show(`Created ${count} simulated opportunities.`);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to activate simulation.');
    } finally {
      this.activating.set(false);
    }
  }
}
