import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { LanguageSwitcher } from '../core/i18n/language-switcher';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, LanguageSwitcher],
  templateUrl: './login-page.html',
  styleUrls: ['./auth-card.scss'],
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly submitting = signal(false);
  readonly errorMessage = signal('');

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  async submit() {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.errorMessage.set('');

    const { email, password } = this.form.getRawValue();
    const { error } = await this.auth.signIn(email, password);

    this.submitting.set(false);
    if (error) {
      this.errorMessage.set(error.message);
      return;
    }
    this.router.navigateByUrl('/dashboard');
  }
}
