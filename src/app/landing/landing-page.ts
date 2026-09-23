import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BillingService } from '../billing/billing.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { LanguageSwitcher } from '../core/i18n/language-switcher';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, TranslatePipe, LanguageSwitcher],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
})
export class LandingPage {
  readonly plans = inject(BillingService).getPlans();
}
