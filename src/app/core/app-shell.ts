import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './auth.service';
import { SimulationService } from '../import/simulation.service';
import { ToastService } from './toast.service';
import { TranslatePipe } from './i18n/translate.pipe';
import { LanguageSwitcher } from './i18n/language-switcher';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe, LanguageSwitcher],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly simulation = inject(SimulationService);
  protected readonly toasts = inject(ToastService);

  readonly simulationActive = signal(false);

  constructor() {
    this.simulation
      .isActive()
      .then((active) => this.simulationActive.set(active))
      .catch(() => this.simulationActive.set(false));
  }

  async signOut() {
    await this.auth.signOut();
    this.router.navigateByUrl('/login');
  }
}
