import { Component, inject, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  type AbstractControl,
  type ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { LanguageSwitcher } from '../core/i18n/language-switcher';
import { I18nService } from '../core/i18n/i18n.service';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-signup-page',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, LanguageSwitcher],
  templateUrl: './signup-page.html',
  styleUrls: ['./auth-card.scss'],
})
export class SignupPage {
  private readonly i18n = inject(I18nService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly submitting = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly form = this.fb.nonNullable.group(
    {
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  async submit() {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.errorMessage.set('');

    const { fullName, email, password } = this.form.getRawValue();
    const { data, error } = await this.auth.signUp(email, password, fullName);

    this.submitting.set(false);
    if (error) {
      this.errorMessage.set(error.message);
      return;
    }

    if (data.session) {
      this.router.navigateByUrl('/onboarding');
    } else {
      this.successMessage.set(this.i18n.t('Check your inbox to confirm your email, then sign in.'));
    }
  }
}
