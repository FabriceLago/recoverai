import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-reset-password-page',
  imports: [ReactiveFormsModule],
  templateUrl: './reset-password-page.html',
  styleUrls: ['./auth-card.scss'],
})
export class ResetPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly submitting = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  async submit() {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.errorMessage.set('');

    const { password } = this.form.getRawValue();
    const { error } = await this.auth.updatePassword(password);

    this.submitting.set(false);
    if (error) {
      this.errorMessage.set(error.message);
      return;
    }
    this.successMessage.set('Password updated. Redirecting to sign in…');
    setTimeout(() => this.router.navigateByUrl('/login'), 1500);
  }
}
