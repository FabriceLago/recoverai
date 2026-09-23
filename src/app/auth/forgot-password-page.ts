import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { LanguageSwitcher } from '../core/i18n/language-switcher';
import { I18nService } from '../core/i18n/i18n.service';

@Component({
  selector: 'app-forgot-password-page',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, LanguageSwitcher],
  templateUrl: './forgot-password-page.html',
  styleUrls: ['./auth-card.scss'],
})
export class ForgotPasswordPage {
  private readonly i18n = inject(I18nService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly submitting = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async submit() {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.errorMessage.set('');

    const { email } = this.form.getRawValue();
    const { error } = await this.auth.resetPasswordForEmail(email);

    this.submitting.set(false);
    if (error) {
      this.errorMessage.set(error.message);
      return;
    }
    this.successMessage.set(this.i18n.t('If that email exists, a reset link is on its way.'));
  }
}
