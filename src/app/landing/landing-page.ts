import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BillingService } from '../billing/billing.service';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
})
export class LandingPage {
  readonly plans = inject(BillingService).getPlans();
}
