import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-forgot-password-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password-page.html',
  styleUrls: ['./auth-card.scss'],
})
export class ForgotPasswordPage {
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
    this.successMessage.set('If that email exists, a reset link is on its way.');
  }
}
